<?php
session_start();
header('Content-Type: application/json');

$file = __DIR__ . '/../DATA/destination.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    readfile($file);
    exit;
}

if (empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Not authorized' . json_encode($_SESSION) .  'id=' . session_id()]);
    exit;
}

$in = json_decode(file_get_contents('php://input'), true);
$action = $in['action'] ?? '';
$id = preg_replace('/[^a-z0-9-]/', '', strtolower($in['id'] ?? ''));

if ($id === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing id']);
    exit;
}

$fp = fopen($file, 'c+');
flock($fp, LOCK_EX);
$data = json_decode(stream_get_contents($fp), true) ?: ['entrance' => null, 'destinations' => []];

if ($action === 'save') {
    $label = trim($in['label'] ?? '');
    $route = $in['route'] ?? [];
    $valid = $label !== '' && is_array($route) && count($route) >= 1;
    foreach ($route as $p) {
        if (!is_array($p) || count($p) !== 3 || array_filter($p, 'is_numeric') !== $p) $valid = false;
    }
    if (!$valid) {
        flock($fp, LOCK_UN); fclose($fp);
        http_response_code(400);
        echo json_encode(['error' => 'Invalid name or route']);
        exit;
    }
    $data['destinations'][$id] = [
        'label' => $label,
        'route' => array_map(fn($p) => array_map('floatval', $p), $route),
    ];
} elseif ($action === 'delete') {
    unset($data['destinations'][$id]);
}

ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($data, JSON_PRETTY_PRINT));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['ok' => true]);