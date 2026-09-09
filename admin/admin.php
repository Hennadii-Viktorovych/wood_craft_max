<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

session_start();
header('Content-Type: application/json; charset=utf-8');

$jsonFile = __DIR__ . '/../json/product.json';
$ordersFile = __DIR__ . '/../json/orders.json';
$adminPassword = 'woodcraft2024';

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
if (empty($action) && isset($_GET['action'])) {
    $action = $_GET['action'];
}

function checkAuth($inputPassword = '') {
    global $adminPassword;
    if (isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true) return true;
    if (!empty($inputPassword) && $inputPassword === $adminPassword) {
        $_SESSION['is_admin'] = true;
        return true;
    }
    return false;
}

if ($action === 'login') {
    $password = $input['password'] ?? '';
    if ($password === $adminPassword) {
        $_SESSION['is_admin'] = true;
        echo json_encode(['ok' => true, 'token' => session_id()]);
    } else {
        echo json_encode(['ok' => false, 'error' => 'Невірний пароль']);
    }
    exit;
}

if ($action === 'get_products') {
    $products = [];
    if (file_exists($jsonFile)) {
        $data = json_decode(file_get_contents($jsonFile), true);
        if (is_array($data)) {
            $products = array_values($data);
        }
    }
    echo json_encode(['ok' => true, 'products' => $products], JSON_UNESCAPED_UNICODE);
    exit;
}

$token = $input['token'] ?? $_POST['token'] ?? '';
if (empty($token) && !checkAuth()) {
    echo json_encode(['ok' => false, 'error' => 'Не авторизовано']);
    exit;
}

if ($action === 'upload_image') {
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['image']['tmp_name'];
        $fileName = $_FILES['image']['name'];
        $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        if (in_array($fileExtension, ['jpg', 'jpeg', 'png', 'webp'])) {
            $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
            $uploadFileDir = __DIR__ . '/../images/product/';

            if (!is_dir($uploadFileDir)) {
                mkdir($uploadFileDir, 0755, true);
            }

            if (move_uploaded_file($fileTmpPath, $uploadFileDir . $newFileName)) {
                echo json_encode(['ok' => true, 'path' => 'images/product/' . $newFileName]);
                exit;
            }
        }
    }
    echo json_encode(['ok' => false, 'error' => 'Помилка завантаження файлу']);
    exit;
}

if ($action === 'save_product') {
    $products = [];
    if (file_exists($jsonFile)) {
        $data = json_decode(file_get_contents($jsonFile), true);
        $products = is_array($data) ? $data : [];
    }

    $id = $input['id'] ?? '';
    if (empty($id)) {
        $id = 'prod_' . uniqid();
    }

    $name = trim($input['name'] ?? '');

    $images = array_map(function($img) {
        return ltrim(str_replace('\\', '/', $img), '/');
    }, $input['images'] ?? []);

    $imagePath = $input['image'] ?? ($images[0] ?? '');
    $image = $imagePath ? ltrim(str_replace('\\', '/', $imagePath), '/') : '';

    $productData = [
        'id' => $id,
        'name' => $name,
        'title' => $name,
        'price' => floatval($input['price'] ?? 0),
        'category' => trim($input['category'] ?? ''),
        'short_desc' => trim($input['short_desc'] ?? ''),
        'description' => trim($input['description'] ?? ''),
        'images' => $images,
        'image' => $image,
        'img' => $image,
        'in_stock' => (bool)($input['in_stock'] ?? true)
    ];

    $found = false;
    foreach ($products as &$p) {
        if ((string)$p['id'] === (string)$id) {
            $p = array_merge($p, $productData);
            $found = true;
            break;
        }
    }
    if (!$found) {
        array_unshift($products, $productData);
    }

    if (!is_dir(dirname($jsonFile))) {
        mkdir(dirname($jsonFile), 0755, true);
    }
    file_put_contents($jsonFile, json_encode(array_values($products), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'toggle_stock') {
    $products = [];
    if (file_exists($jsonFile)) {
        $data = json_decode(file_get_contents($jsonFile), true);
        $products = is_array($data) ? $data : [];
    }
    $id = $input['id'] ?? '';
    foreach ($products as &$p) {
        if ((string)$p['id'] === (string)$id) {
            $p['in_stock'] = !($p['in_stock'] ?? true);
            break;
        }
    }
    file_put_contents($jsonFile, json_encode(array_values($products), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'delete_product') {
    $products = [];
    if (file_exists($jsonFile)) {
        $data = json_decode(file_get_contents($jsonFile), true);
        $products = is_array($data) ? $data : [];
    }
    $id = $input['id'] ?? '';

    $products = array_values(array_filter($products, function($p) use ($id) {
        return (string)$p['id'] !== (string)$id;
    }));

    file_put_contents($jsonFile, json_encode($products, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'get_orders') {
    $orders = [];
    if (file_exists($ordersFile)) {
        $data = json_decode(file_get_contents($ordersFile), true);
        $orders = is_array($data) ? $data : [];
    }
    echo json_encode(['ok' => true, 'orders' => $orders], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'update_order') {
    $orders = [];
    if (file_exists($ordersFile)) {
        $data = json_decode(file_get_contents($ordersFile), true);
        $orders = is_array($data) ? $data : [];
    }
    $id = $input['id'] ?? '';
    $status = $input['status'] ?? 'new';
    foreach ($orders as &$o) {
        if ((string)$o['id'] === (string)$id) {
            $o['status'] = $status;
            break;
        }
    }
    file_put_contents($ordersFile, json_encode(array_values($orders), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'delete_order') {
    $orders = [];
    if (file_exists($ordersFile)) {
        $data = json_decode(file_get_contents($ordersFile), true);
        $orders = is_array($data) ? $data : [];
    }
    $id = $input['id'] ?? '';

    $orders = array_values(array_filter($orders, function($o) use ($id) {
        return (string)$o['id'] !== (string)$id;
    }));

    file_put_contents($ordersFile, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(['ok' => false, 'error' => 'Невідома дія'], JSON_UNESCAPED_UNICODE);