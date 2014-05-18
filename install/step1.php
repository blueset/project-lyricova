<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Step 1 - Installation wizard - Project Gy</title>
	<link rel="stylesheet" href="css/bootstrap.min.css">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="css/bootstrap-responsive.css">
	<link rel="stylesheet" href="css/opa-icons.css">
	<link rel="stylesheet" href="css/font-awesome.min.css">
  <link rel="stylesheet" href="css/installer.css">
</head>
<body>
	<div class="container">
      <div class="header">
        <h3 class="text-muted">Project Gy</h3>
      </div>

      <h1>Step 1 <small>Configue basic settings</small></h1>
      <form action="step2.php" role="form" method="POST">
        <div class="form-group">
          <label for="base-url">Base URL</label>
          <input type="text" class="form-control" id="base-url" name="base-url" placeholder="http://www.example.com/Project-gy">
        </div>
        <div class="form-group">
          <label for="encryption-code">Encryption Code</label>
          <input type="text" class="form-control" id="encryption-code" name="encryption-code" placeholder="EncryptionCode12345678">
        </div>
        <div class="form-group">
          <label for="db-address">Database Address</label>
          <input type="text" class="form-control" id="db-address" name="db-address" placeholder="localhost">
        </div>
        <div class="form-group">
          <label for="db-name">Database Name</label>
          <input type="text" class="form-control" id="db-name" name="db-name" placeholder="Project-Gy">
        </div>
        <div class="form-group">
          <label for="db-username">Database Username</label>
          <input type="text" class="form-control" id="db-username" name="db-username" placeholder="root (not suggested)">
        </div>
        <div class="form-group">
          <label for="db-password">Database Password</label>
          <input type="text" class="form-control" id="db-password" name="db-password" placeholder="●●●●●●●●●">
        </div>
        <div class="form-group">
          <label for="db-prefix">Database prefix</label>
          <input type="text" class="form-control" id="db-prefix" name="db-prefix" placeholder="GY_" value="GY_">
        </div>
        <div class="form-group">
          <label for="admin-username">Your Username</label>
          <input type="text" class="form-control" id="admin-username" name="admin-username" placeholder="admin" value="admin">
        </div>
        <div class="form-group">
          <label for="admin-password">Your Password</label>
          <input type="text" class="form-control" id="admin-password" name="admin-password" placeholder="●●●●●●●●●">
        </div>
         <div class="form-group">
          <label for="admin-email">Your Password</label>
          <input type="text" class="form-control" id="admin-email" name="admin-email" placeholder="example@project-gy.com">
        </div>
         <div class="form-group">
          <label for="admin-displayname">Your Password</label>
          <input type="text" class="form-control" id="admin-displayname" name="admin-displayname" placeholder="Eana Hufwe">
        </div>
        <div class="checkbox">
          <label>
            <input type="checkbox" id="use-htaccess" name="use-htaccess" checked> My server support htaccess.
          </label>
        </div>
        <input type="submit" name="submit" value="Next" class="btn btn-default" />
      </form>
      <div class="footer">
        <p>&copy; Blueset Studio 2014</p>
      </div>

    </div> 
</body>
</html>