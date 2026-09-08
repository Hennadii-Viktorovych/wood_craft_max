<?php
header('Content-Type: application/json; charset=utf-8');

define('ADMIN_PASSWORD', 'woodcraft2024');
define('PRODUCTS_FILE', '../data/product_2.json');
define('ORDERS_FILE', '../data/orders.json');
define('TOKEN_FILE', '../data/tokens.json');
define('UPLOAD_DIR', '../images/'); // Папка для завантаження фотографій

$action = $_GET['action'] ?? '';
$input = file_get_contents('php://input');
$body = json_decode($input, true) ?? [];

function resp($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function err($msg, $code = 400) {
    http_response_code($code);
    resp(['ok' => false, 'error' => $msg]);
}

function read_json($file, $default = []) {
    if (!file_exists($file)) return $default;
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : $default;
}

function write_json($file, $data) {
    $dir = dirname($file);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function check_token($token) {
    if (!$token) return false;
    $tokens = read_json(TOKEN_FILE, []);
    return isset($tokens[$token]) && $tokens[$token] > time();
}

function translit($string) {
    $converter = [
        'а' => 'a',   'б' => 'b',   'в' => 'v',  'г' => 'h',  'ґ' => 'g',
        'д' => 'd',   'е' => 'e',   'є' => 'ye', 'ж' => 'zh', 'з' => 'z',
        'и' => 'y',   'і' => 'i',   'ї' => 'yi', 'й' => 'y',  'к' => 'k',
        'л' => 'l',   'м' => 'm',   'н' => 'n',  'о' => 'o',  'п' => 'p',
        'р' => 'r',   'с' => 's',   'т' => 't',  'у' => 'u',  'ф' => 'f',
        'х' => 'kh',  'ц' => 'ts',  'ч' => 'ch', 'ш' => 'sh', 'щ' => 'shch',
        'ь' => '',    'ю' => 'yu',  'я' => 'ya',
    ];
    $string = mb_strtolower($string, 'UTF-8');
    $string = strtr($string, $converter);
    $string = preg_replace('/[^\w\s-]/u', '', $string);
    $string = preg_replace('/[\s-]+/', '-', $string);
    return trim($string, '-');
}

$token = $body['token'] ?? ($_POST['token'] ?? ($_SERVER['HTTP_X_TOKEN'] ?? ''));

switch ($action) {
    case 'login':
        if (($body['password'] ?? '') === ADMIN_PASSWORD) {
            $newToken = bin2hex(random_bytes(16));
            $tokens = read_json(TOKEN_FILE, []);
            $tokens[$newToken] = time() + (86400 * 7);
            write_json(TOKEN_FILE, $tokens);
            resp(['ok' => true, 'token' => $newToken]);
        } else {
            err('Невірний пароль', 401);
        }
        break;

    case 'get_products':
        $products = read_json(PRODUCTS_FILE, []);
        resp(['ok' => true, 'products' => array_values($products)]);
        break;

    case 'upload_image':
        if (!check_token($token)) err('Не авторизовано', 401);

        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            err('Помилка завантаження файлу');
        }

        $file = $_FILES['image'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'webp'];

        if (!in_array($ext, $allowed)) err('Недопустимий формат файлу (дозволено: jpg, png, webp)');

        if (!is_dir(UPLOAD_DIR)) {
            mkdir(UPLOAD_DIR, 0755, true);
        }

        $filename = 'prod_' . time() . '_' . rand(100, 999) . '.' . $ext;
        $targetPath = UPLOAD_DIR . $filename;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            // Повертаємо відносний шлях для бази даних
            $relPath = './images/' . $filename;
            resp(['ok' => true, 'path' => $relPath]);
        } else {
            err('Не вдалося зберегти файл на сервері');
        }
        break;

    case 'save_product':
        if (!check_token($token)) err('Не авторизовано', 401);

        $products = read_json(PRODUCTS_FILE, []);
        $id = $body['id'] ?? null;

        $item = $id ? ($products[$id] ?? []) : [];
        $id = $id ?: 'prod_' . sprintf('%03d', count($products) + 1);

        $name = strip_tags(trim($body['name'] ?? ''));
        if (!$name) err('Назва товару обов\'язкова');

        $img = strip_tags(trim($body['image'] ?? ''));

        $item['id']          = $id;
        $item['name']        = $name;
        $item['slug']        = translit($name);
        $item['category']    = strip_tags(trim($body['category'] ?? ''));
        $item['price']       = (float)($body['price'] ?? 0);
        $item['old_price']   = !empty($body['old_price']) ? (float)$body['old_price'] : null;
        $item['in_stock']    = isset($body['in_stock']) ? (bool)$body['in_stock'] : true;
        $item['short_desc']  = mb_substr(strip_tags(trim($body['description'] ?? '')), 0, 150);
        $item['description'] = strip_tags(trim($body['description'] ?? ''));
        $item['specs']       = is_array($body['characteristics'] ?? []) ? $body['characteristics'] : new stdClass();
        $item['features']    = is_array($body['tags'] ?? []) ? $body['tags'] : [];

        // Обробка ш шляху до зображення
        if ($img) {
            if (!str_starts_with($img, './') && !str_starts_with($img, 'http')) {
                $img = './' . ltrim($img, '/');
            }
            $item['images'] = [$img];
        } else if (!isset($item['images']) || empty($item['images'])) {
            $item['images'] = [];
        }

        $item['updated_at']  = date('Y-m-d H:i:s');
        if (!isset($item['created_at'])) $item['created_at'] = date('Y-m-d H:i:s');

        $products[$id] = $item;
        write_json(PRODUCTS_FILE, $products);
        resp(['ok' => true, 'product' => $item]);
        break;

    case 'delete_product':
        if (!check_token($token)) err('Не авторизовано', 401);
        $id = $body['id'] ?? '';
        $products = read_json(PRODUCTS_FILE, []);
        if (isset($products[$id])) {
            unset($products[$id]);
            write_json(PRODUCTS_FILE, $products);
        }
        resp(['ok' => true]);
        break;

    default:
        err('Невідома дія');
}