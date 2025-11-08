<?php
require_once __DIR__ . '/db.php';

function assemble_branches(PDO $pdo): array {
  $branches = [];
  $rows = $pdo->query('SELECT id, ui_id, name, address, phone1, phone2, printer_system_key, active FROM branches ORDER BY id ASC')->fetchAll();
  $periodsRows = $pdo->query('SELECT id, ui_id, branch_id, start_min, end_min, default_prices FROM branch_periods')->fetchAll();
  $periodsByBranch = [];
  foreach ($periodsRows as $p){
    $pid = (int)$p['branch_id'];
    $pp = [ 'id' => $p['ui_id'], 'start' => (int)$p['start_min'], 'end' => (int)$p['end_min'] ];
    if (!empty($p['default_prices'])){ $pp['defaultPrices'] = json_decode((string)$p['default_prices'], true); }
    $periodsByBranch[$pid][] = $pp;
  }
  $sysRows = $pdo->query('SELECT id, ui_id, branch_id, name FROM systems')->fetchAll();
  $sysByBranch = [];
  foreach ($sysRows as $s){ $sysByBranch[(int)$s['branch_id']][] = [ 'id' => $s['ui_id'], 'name' => $s['name'], '_id' => (int)$s['id'] ]; }
  $priceRows = $pdo->query('SELECT spp.system_id, bp.ui_id AS period_ui, spp.prices FROM system_period_prices spp JOIN branch_periods bp ON bp.id = spp.period_id')->fetchAll();
  $pricesBySystem = [];
  foreach ($priceRows as $r){ $pricesBySystem[(int)$r['system_id']][$r['period_ui']] = json_decode((string)$r['prices'], true); }
  $metaRows = $pdo->query('SELECT branch_id, buffet_categories, buffet_items, kitchen_items, special_items, employees FROM branch_meta')->fetchAll();
  $metaByBranch = [];
  foreach ($metaRows as $m){
    $metaByBranch[(int)$m['branch_id']] = [
      'buffetCategories' => $m['buffet_categories'] ? json_decode((string)$m['buffet_categories'], true) : [],
      'buffetItems' => $m['buffet_items'] ? json_decode((string)$m['buffet_items'], true) : [],
      'kitchenItems' => $m['kitchen_items'] ? json_decode((string)$m['kitchen_items'], true) : [],
      'specialItems' => $m['special_items'] ? json_decode((string)$m['special_items'], true) : [],
      'employees' => $m['employees'] ? json_decode((string)$m['employees'], true) : [],
    ];
  }
  foreach ($rows as $b){
    $bid = (int)$b['id'];
    $obj = [
      'id' => $b['ui_id'], 'name' => $b['name'],
      'address' => $b['address'], 'phone1' => $b['phone1'], 'phone2' => $b['phone2'],
      'printerSystemKey' => $b['printer_system_key'],
      'active' => (int)$b['active'] === 1,
    ];
    $obj['periods'] = $periodsByBranch[$bid] ?? [];
    $systems = $sysByBranch[$bid] ?? [];
    if ($systems){
      foreach ($systems as &$s){
        $sid = $s['_id']; unset($s['_id']);
        if (isset($pricesBySystem[$sid])){ $s['pricesByPeriod'] = $pricesBySystem[$sid]; }
      }
    }
    $obj['systems'] = $systems;
    $meta = $metaByBranch[$bid] ?? [ 'buffetCategories'=>[], 'buffetItems'=>[], 'kitchenItems'=>[], 'specialItems'=>[], 'employees'=>[] ];
    $obj = array_merge($obj, $meta);
    $branches[] = $obj;
  }
  return $branches;
}

function persist_branches(PDO $pdo, array $branches): void {
  $pdo->beginTransaction();
  try {
    $incoming = [];
    foreach ($branches as $b){ if (!empty($b['id'])) $incoming[] = (string)$b['id']; }
    if ($incoming){
      $in = implode(',', array_fill(0, count($incoming), '?'));
      $stmt = $pdo->prepare("DELETE FROM branches WHERE ui_id NOT IN ($in)");
      $stmt->execute($incoming);
    } else {
      $pdo->exec('DELETE FROM branches');
    }

    $selBranch = $pdo->prepare('SELECT id FROM branches WHERE ui_id = ? LIMIT 1');
    $insBranch = $pdo->prepare('INSERT INTO branches(ui_id, name, address, phone1, phone2, printer_system_key, active) VALUES(?,?,?,?,?,?,?)');
    $updBranch = $pdo->prepare('UPDATE branches SET name=?, address=?, phone1=?, phone2=?, printer_system_key=?, active=? WHERE id=?');

    $delPeriods = $pdo->prepare('DELETE FROM branch_periods WHERE branch_id = ?');
    $insPeriod = $pdo->prepare('INSERT INTO branch_periods(ui_id, branch_id, start_min, end_min, default_prices) VALUES(?,?,?,?,?)');

    $delSystems = $pdo->prepare('DELETE FROM systems WHERE branch_id = ?');
    $insSystem = $pdo->prepare('INSERT INTO systems(ui_id, branch_id, name) VALUES(?,?,?)');

    $delMeta = $pdo->prepare('DELETE FROM branch_meta WHERE branch_id = ?');
    $insMeta = $pdo->prepare('INSERT INTO branch_meta(branch_id, buffet_categories, buffet_items, kitchen_items, special_items, employees) VALUES(?,?,?,?,?,?)');

    $insSPP = $pdo->prepare('INSERT INTO system_period_prices(system_id, period_id, prices) VALUES(?,?,?) ON DUPLICATE KEY UPDATE prices=VALUES(prices)');
    $delSPPForBranch = $pdo->prepare('DELETE spp FROM system_period_prices spp JOIN systems s ON s.id = spp.system_id WHERE s.branch_id = ?');

    foreach ($branches as $b){
      $ui = (string)($b['id'] ?? ''); if ($ui === '') continue;
      $name = (string)($b['name'] ?? '');
      $addr = $b['address'] ?? null;
      $ph1 = $b['phone1'] ?? null; $ph2 = $b['phone2'] ?? null;
      $printer = $b['printerSystemKey'] ?? null;
      $active = !empty($b['active']) ? 1 : 0;

      $selBranch->execute([$ui]);
      $bid = (int)($selBranch->fetchColumn() ?: 0);
      if ($bid <= 0){
        $insBranch->execute([$ui, $name, $addr, $ph1, $ph2, $printer, $active]);
        $bid = (int)$pdo->lastInsertId();
      } else {
        $updBranch->execute([$name, $addr, $ph1, $ph2, $printer, $active, $bid]);
      }

      $delSPPForBranch->execute([$bid]);
      $delPeriods->execute([$bid]);
      $delSystems->execute([$bid]);

      $periodIdMap = [];
      foreach ((array)($b['periods'] ?? []) as $p){
        $pui = (string)($p['id'] ?? ''); if ($pui === '') continue;
        $start = (int)($p['start'] ?? 0); $end = (int)($p['end'] ?? 0);
        $def = isset($p['defaultPrices']) ? json_encode($p['defaultPrices'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) : null;
        $insPeriod->execute([$pui, $bid, $start, $end, $def]);
        $periodIdMap[$pui] = (int)$pdo->lastInsertId();
      }

      $systemIdMap = [];
      foreach ((array)($b['systems'] ?? []) as $s){
        $sui = (string)($s['id'] ?? ''); if ($sui === '') continue;
        $sname = (string)($s['name'] ?? '');
        $insSystem->execute([$sui, $bid, $sname]);
        $sid = (int)$pdo->lastInsertId();
        $systemIdMap[$sui] = $sid;
      }

      foreach ((array)($b['systems'] ?? []) as $s){
        $sui = (string)($s['id'] ?? ''); if ($sui === '') continue;
        $sid = $systemIdMap[$sui] ?? 0; if (!$sid) continue;
        $pbp = (array)($s['pricesByPeriod'] ?? []);
        foreach ($pbp as $pui => $prices){
          $pid = $periodIdMap[$pui] ?? 0; if (!$pid) continue;
          $insSPP->execute([$sid, $pid, json_encode($prices, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)]);
        }
      }

      $delMeta->execute([$bid]);
      $insMeta->execute([
        $bid,
        json_encode($b['buffetCategories'] ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
        json_encode($b['buffetItems'] ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
        json_encode($b['kitchenItems'] ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
        json_encode($b['specialItems'] ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
        json_encode($b['employees'] ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
      ]);
    }

    $pdo->commit();
  } catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
  }
}

