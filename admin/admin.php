<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

session_start();
header('Content-Type: application/json; charset=utf-8');

$jsonFile      = __DIR__ . '/../json/product.json';
$ordersFile    = __DIR__ . '/../json/orders.json';
$adminPassword = 'woodcraft2024';

$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');
$input  = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_POST;

function checkAuth() {
    return isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;
}

function readJson($file) {
    if (!file_exists($file)) return array();
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : array();
}

function writeJson($file, $data) {
    $dir = dirname($file);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents($file, json_encode(array_values($data), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

if ($action === 'login') {
    $password = isset($input['password']) ? $input['password'] : '';
    if ($password === $adminPassword) {
        $_SESSION['is_admin'] = true;
        echo json_encode(array('ok' => true, 'token' => session_id()));
    } else {
        echo json_encode(array('ok' => false, 'error' => 'Nevіrniy parol'));
    }
    exit;
}

if ($action === 'get_products') {
    $products = readJson($jsonFile);
    echo json_encode(array('ok' => true, 'products' => array_values($products)), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'submit_order') {
    $name    = strip_tags(trim(isset($input['name'])    ? $input['name']    : ''));
    $phone   = strip_tags(trim(isset($input['phone'])   ? $input['phone']   : ''));
    $message = strip_tags(trim(isset($input['message']) ? $input['message'] : ''));
    $items   = (isset($input['cart']) && is_array($input['cart'])) ? $input['cart'] : array();

    if (!$name || !$phone) {
        echo json_encode(array('ok' => false, 'error' => 'Vkazit imya ta telefon'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $clean_items = array();
    foreach ($items as $item) {
        $qty = 1;
        if (isset($item['qty']))          $qty = (int)$item['qty'];
        elseif (isset($item['quantity'])) $qty = (int)$item['quantity'];
        $clean_items[] = array(
            'id'    => strip_tags(isset($item['id'])    ? $item['id']    : ''),
            'name'  => strip_tags(isset($item['name'])  ? $item['name']  : ''),
            'price' => (float)(isset($item['price'])    ? $item['price'] : 0),
            'qty'   => $qty,
        );
    }

    $total = 0;
    foreach ($clean_items as $i) { $total += $i['price'] * $i['qty']; }

    $orders   = readJson($ordersFile);
    $orders[] = array(
        'id'      => uniqid('ord_'),
        'name'    => $name,
        'phone'   => $phone,
        'message' => $message,
        'cart'    => $clean_items,
        'total'   => $total,
        'status'  => 'new',
        'date'    => date('Y-m-d H:i:s'),
    );

    $dir = dirname($ordersFile);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents($ordersFile, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(array('ok' => true, 'message' => 'Dyakuemo!'), JSON_UNESCAPED_UNICODE);
    exit;
}

$token = '';
if (isset($input['token']))     $token = $input['token'];
elseif (isset($_POST['token'])) $token = $_POST['token'];
if (empty($token) && !checkAuth()) {
    echo json_encode(array('ok' => false, 'error' => 'Ne avtorizovano'), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'upload_image') {
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath   = $_FILES['image']['tmp_name'];
        $fileName      = $_FILES['image']['name'];
        $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        if (in_array($fileExtension, array('jpg','jpeg','png','webp'))) {
            $newFileName   = md5(time() . $fileName) . '.' . $fileExtension;
            $uploadFileDir = __DIR__ . '/../images/product/';
            if (!is_dir($uploadFileDir)) mkdir($uploadFileDir, 0755, true);
            if (move_uploaded_file($fileTmpPath, $uploadFileDir . $newFileName)) {
                echo json_encode(array('ok' => true, 'path' => 'images/product/' . $newFileName), JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
    }
    echo json_encode(array('ok' => false, 'error' => 'Pomilka zavantazhennya'), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'save_product') {
    $products  = readJson($jsonFile);
    $id        = isset($input['id']) ? $input['id'] : '';
    if (empty($id)) $id = 'prod_' . uniqid();

    $rawImages = (isset($input['images']) && is_array($input['images'])) ? $input['images'] : array();
    $images    = array();
    foreach ($rawImages as $img) { $images[] = ltrim(str_replace('\\', '/', $img), '/'); }

    $image = '';
    if (!empty($images)) $image = $images[0];
    elseif (isset($input['image']) && $input['image']) $image = ltrim(str_replace('\\', '/', $input['image']), '/');

    $oldPrice = null;
    if (isset($input['old_price']) && $input['old_price'] !== '' && $input['old_price'] !== null) {
        $oldPrice = floatval($input['old_price']);
    }

    $productData = array(
        'id'          => $id,
        'name'        => trim(isset($input['name'])        ? $input['name']        : ''),
        'title'       => trim(isset($input['name'])        ? $input['name']        : ''),
        'price'       => floatval(isset($input['price'])   ? $input['price']       : 0),
        'old_price'   => $oldPrice,
        'category'    => trim(isset($input['category'])    ? $input['category']    : ''),
        'short_desc'  => trim(isset($input['short_desc'])  ? $input['short_desc']  : ''),
        'description' => trim(isset($input['description']) ? $input['description'] : ''),
        'specs'       => (isset($input['specs'])    && is_array($input['specs']))    ? $input['specs']    : array(),
        'features'    => (isset($input['features']) && is_array($input['features'])) ? $input['features'] : array(),
        'images'      => $images,
        'image'       => $image,
        'img'         => $image,
        'in_stock'    => isset($input['in_stock']) ? (bool)$input['in_stock'] : true,
    );

    $found = false;
    foreach ($products as &$p) {
        if ((string)$p['id'] === (string)$id) { $p = array_merge($p, $productData); $found = true; break; }
    }
    if (!$found) array_unshift($products, $productData);

    writeJson($jsonFile, $products);
    echo json_encode(array('ok' => true), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'toggle_stock') {
    $products = readJson($jsonFile);
    $id = isset($input['id']) ? $input['id'] : '';
    foreach ($products as &$p) {
        if ((string)$p['id'] === (string)$id) {
            $p['in_stock'] = !(isset($p['in_stock']) ? (bool)$p['in_stock'] : true);
            break;
        }
    }
    writeJson($jsonFile, $products);
    echo json_encode(array('ok' => true), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'delete_product') {
    $products = readJson($jsonFile);
    $id       = isset($input['id']) ? $input['id'] : '';
    $filtered = array();
    foreach ($products as $p) { if ((string)$p['id'] !== (string)$id) $filtered[] = $p; }
    writeJson($jsonFile, $filtered);
    echo json_encode(array('ok' => true), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'get_orders') {
    $orders = readJson($ordersFile);
    usort($orders, function($a, $b) {
        $da = isset($a['date']) ? $a['date'] : '';
        $db = isset($b['date']) ? $b['date'] : '';
        return strcmp($db, $da);
    });
    echo json_encode(array('ok' => true, 'orders' => $orders), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'update_order') {
    $orders = readJson($ordersFile);
    $id     = isset($input['id'])     ? $input['id']     : '';
    $status = isset($input['status']) ? $input['status'] : 'new';
    foreach ($orders as &$o) {
        if ((string)$o['id'] === (string)$id) { $o['status'] = $status; break; }
    }
    writeJson($ordersFile, $orders);
    echo json_encode(array('ok' => true), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'delete_order') {
    $orders   = readJson($ordersFile);
    $id       = isset($input['id']) ? $input['id'] : '';
    $filtered = array();
    foreach ($orders as $o) { if ((string)$o['id'] !== (string)$id) $filtered[] = $o; }
    writeJson($ordersFile, $filtered);
    echo json_encode(array('ok' => true), JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(array('ok' => false, 'error' => 'Nevidoma diya'), JSON_UNESCAPED_UNICODE);