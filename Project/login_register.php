<?php
session_start();
require_once 'db_conn.php';

if (isset($_POST['signup'])) {
    $uname = $_POST['uname'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
    $role = 'user'; // never trust the form for this; create admins in the database

    $stmt = $conn->prepare("SELECT uname FROM user WHERE uname = ?");
    $stmt->bind_param("s", $uname);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        $_SESSION['signup_error'] = 'Username is Already Used!';
        $_SESSION['active_form'] = 'signup';
    } else {
        $insert = $conn->prepare("INSERT INTO user (uname, password, role) VALUES (?, ?, ?)");
        $insert->bind_param("sss", $uname, $password, $role);
        $insert->execute();
    }

    header("Location: login.php");
    exit();
}

if (isset($_POST['login'])) {
    $uname = $_POST['uname'];
    $password = $_POST['password'];

    $stmt = $conn->prepare("SELECT * FROM user WHERE uname = ?");
    $stmt->bind_param("s", $uname);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();

        if (password_verify($password, $user['password'])) {
            $_SESSION['uname'] = $user['uname'];
            $_SESSION['is_admin'] = (strtolower(trim($user['role'])) === 'admin');

            if ($_SESSION['is_admin']) {
                header("Location: admin_page.php");
            } else {
                header("Location: user_page.php");
            }
            exit();
        }
    }

    $_SESSION['login_error'] = 'Incorrect Username or Password';
    $_SESSION['active_form'] = 'login';
    header("Location: login.php");
    exit();
}
?>