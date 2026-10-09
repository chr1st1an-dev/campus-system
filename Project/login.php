<?php
session_start();

$errors = [
    'login' => $_SESSION['login_error'] ?? '',
    'signup' => $_SESSION['signup_error'] ?? ''
];

$activeForm = $_SESSION['active_form'] ?? 'login';

session_unset();

function showError($error) {
    return !empty($error) ? "<p class= 'error-message'>$error</p>" : '';
}

function isActiveForm($formName, $activeForm) {
    return $formName === $activeForm ? 'active' : '';
}

?>



<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/login.css">
    <title>Document</title>
</head>
<body>
    <div class="container">
        <div class="form-box <?=  isActiveForm('login', $activeForm); ?>" id="login-form">
            <h2>Login</h2>
            <?=  showError($errors['login']); ?>
            <form method = "POST" action = "login_register.php">
                <input type = "text" name = "uname" placeholder="Usernane">
                <input type = "password" name = "password" placeholder="Password">
                <button type = "SUBMIT" name = "login">Login</button>
                <p>Don't have an account? <a href="#" onclick="showForm('signup-form')">Sign Up</a></p>
            </form>
        </div>

        <div class="form-box <?=  isActiveForm('signup', $activeForm); ?>" id="signup-form">
            <h2>Sign Up</h2>
            <?=  showError($errors['signup']); ?>
            <form method = "POST" action = "login_register.php">
                <input type = "text" name = "uname" placeholder="Usernane">
                <input type = "password" name = "password" placeholder="Password">
                <select name = "role" required>
                    <option value="">Select Role</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                </select>
                <button type = "SUBMIT" name = "signup">Sign Up</button>
                <p>Already have an account? <a href="#" onclick="showForm('login-form')">Login</a></p>
            </form>
        </div>
    
    </div>
    <script src="js/login.js"></script>
</body>
</html>