<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Step 2 - Installation wizard - Project Gy</title>
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

      <h1>Step 2 <small>Install process</small></h1>
      <textarea name="loading" id="" cols="30" rows="10" class="form-control">
<?php

// Serious stuff begins
// Check if all varibles are written correctly.

$requiredField = TRUE;
$requiredField = $requiredField && $_POST['base-url']!=='';
$requiredField = $requiredField && $_POST['encryption-code']!=='';
$requiredField = $requiredField && $_POST['db-address']!=='';
$requiredField = $requiredField && $_POST['db-name']!=='';
$requiredField = $requiredField && $_POST['db-username']!=='';
$requiredField = $requiredField && $_POST['db-prefix']!=='';
$requiredField = $requiredField && $_POST['admin-username']!=='';
$requiredField = $requiredField && $_POST['admin-password']!=='';

// Returm message to textarea
if($requiredField){exit('Varibles are not completed.')}

// todo: messgae 'write config.php' to textarea
echo "Write config.php..."
//config.php File
$fileConf = fopen("../gy/config/config.php","w+");

//config.php Content
$contConf = <<<EOT 
<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/* Base Site URL
--------------------
   This is the location you visit your Project Gy website,
   i.e., the address your visit your website.
   e.g.: http://ww.example.com/project-gy
*/

EOT;
$contConf .= "\$config['base_url'] = '".$_POST['base-url']."';";
$contConf .= <<<EOT

/* Index file
--------------------
   Leave it blank if you are using .htaccess feature, otherwise 
   it's value should be 'index.php'
*/

EOT;
if($_POST['use-htaccess']){$indexPage='';}
else{$indexPage='index.php'}
$contConf .= "\$config['index_page'] = '".$indexPage."';";

$contConf .=<<<EOT

/* Encryption Key
--------------------
  This encryption key is used to encrypt your browser 
  session information. Please make sure it is unique.
*/

EOT;
$contConf .= "\$config['encryption_key'] = '".$_POST['encryption-code']."';"

$contConf .= <<<'EOT'

/* Language (beta)
--------------------
   Change display language of Project Gy UI. 
   This feature is currently under developement. 
*/
$config['language'] = 'english';

/* Default Character Set
--------------------
   This determines which character set is used by default.
*/
$config['charset'] = 'UTF-8';



/* Code Igniter framework reserved varibles
--------------------
   These configuration varibles are reserved default for Code Igniter 
   framework to work. 
   For detail information, please check Code Igniter Documentation.
*/
$config['uri_protocol']  = 'AUTO';
$config['url_suffix'] = '';
$config['enable_hooks'] = FALSE;
$config['subclass_prefix'] = '%1\s';
$config['permitted_uri_chars'] = 'a-z 0-9~%.:_\-';
$config['allow_get_array']    = TRUE;
$config['enable_query_strings'] = FALSE;
$config['controller_trigger'] = 'c';
$config['function_trigger']   = 'm';
$config['directory_trigger']  = 'd';
$config['log_threshold'] = 0;
$config['log_path'] = '';
$config['log_date_format'] = 'Y-m-d H:i:s';
$config['cache_path'] = '';
$config['sess_cookie_name']   = 'ci_session';
$config['sess_expiration']    = 7200;
$config['sess_expire_on_close'] = FALSE;
$config['sess_encrypt_cookie']  = FALSE;
$config['sess_use_database']  = FALSE;
$config['sess_table_name']    = 'ci_sessions';
$config['sess_match_ip']    = FALSE;
$config['sess_match_useragent'] = TRUE;
$config['sess_time_to_update']  = 300;
$config['cookie_prefix']  = "";
$config['cookie_domain']  = "";
$config['cookie_path']    = "/";
$config['cookie_secure']  = FALSE;
$config['global_xss_filtering'] = TRUE;
$config['csrf_protection'] = FALSE;
$config['csrf_token_name'] = 'csrf_test_name';
$config['csrf_cookie_name'] = 'csrf_cookie_name';
$config['csrf_expire'] = 7200;
$config['compress_output'] = FALSE;
$config['time_reference'] = 'local';
$config['rewrite_short_tags'] = FALSE;
$config['proxy_ips'] = '';

/* End of file config.php */
/* Location: ./gy/config/config.php */

EOT;

$message = 'Write config.php ... Done';

try{
  fwrite($fileConf, $contConf);
  fclose($fileConf);
}catch(Exception $e){
  $message = $e->getMessage();
}

//TODO: JS - add string message to textarea
echo $message;


// JOB - Write database.php

$fileDb = fopen('../gy/config/database.php','w+');
$contDb = <<<'EOT'

<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');
/*
| -------------------------------------------------------------------
| DATABASE CONNECTIVITY SETTINGS
| -------------------------------------------------------------------
| This file will contain the settings needed to access your database.
|
| For complete instructions please consult the 'Database Connection'
| page of the User Guide.
|
| -------------------------------------------------------------------
| EXPLANATION OF VARIABLES
| -------------------------------------------------------------------
|
| ['hostname'] The hostname of your database server.
| ['username'] The username used to connect to the database
| ['password'] The password used to connect to the database
| ['database'] The name of the database you want to connect to
| ['dbdriver'] The database type. ie: mysql.  Currently supported:
         mysql, mysqli, postgre, odbc, mssql, sqlite, oci8
| ['dbprefix'] You can add an optional prefix, which will be added
|        to the table name when using the  Active Record class
| ['pconnect'] TRUE/FALSE - Whether to use a persistent connection
| ['db_debug'] TRUE/FALSE - Whether database errors should be displayed.
| ['cache_on'] TRUE/FALSE - Enables/disables query caching
| ['cachedir'] The path to the folder where cache files should be stored
| ['char_set'] The character set used in communicating with the database
| ['dbcollat'] The character collation used in communicating with the database
|        NOTE: For MySQL and MySQLi databases, this setting is only used
|          as a backup if your server is running PHP < 5.2.3 or MySQL < 5.0.7
|        (and in table creation queries made with DB Forge).
|          There is an incompatibility in PHP with mysql_real_escape_string() which
|          can make your site vulnerable to SQL injection if you are using a
|          multi-byte character set and are running versions lower than these.
|          Sites using Latin-1 or UTF-8 database character set and collation are unaffected.
| ['swap_pre'] A default table prefix that should be swapped with the dbprefix
| ['autoinit'] Whether or not to automatically initialize the database.
| ['stricton'] TRUE/FALSE - forces 'Strict Mode' connections
|             - good for ensuring strict SQL while developing
|
| The $active_group variable lets you choose which connection group to
| make active.  By default there is only one group (the 'default' group).
|
| The $active_record variables lets you determine whether or not to load
| the active record class
*/

$active_group = 'default';
$active_record = TRUE;

EOT;

$_POST['db-prefix'] = mysql_real_escape_string($_POST['db-prefix']);

$contDb .=  "\$db['default']['hostname'] = '" . $_POST['db-address'] . "';";
$contDb .=  "\$db['default']['username'] = '" . $_POST['db-username'] ."';";
$contDb .=  "\$db['default']['password'] = '" . $_POST['db-password'] ."';";
$contDb .=  "\$db['default']['database'] = '" . $_POST['db-name'] ."';";
$contDb .=  "\$db['default']['dbdriver'] = 'mysql';";
$contDb .=  "\$db['default']['dbprefix'] = '" . $_POST['db-prefix'] ."';";

$contDb .= <<<'EOT'

$db['default']['pconnect'] = TRUE;
$db['default']['db_debug'] = TRUE;
$db['default']['cache_on'] = FALSE;
$db['default']['cachedir'] = '';
$db['default']['char_set'] = 'utf8';
$db['default']['dbcollat'] = 'utf8_general_ci';
$db['default']['swap_pre'] = '';
$db['default']['autoinit'] = TRUE;
$db['default']['stricton'] = FALSE;


/* End of file database.php */
/* Location: ./application/config/database.php */

EOT;

$message = 'Write database.php ... Done';

try{
  fwrite($fileDb, $contDb);
  fclose($fileDb);
}catch(Exception $e){
  $message = $e->getMessage();
}

//TODO: JS - add string message to textarea
echo $message;

// Write mysql query
$dbConn = mysql_connect($_POST['db-address'],$_POST['db-username'],$_POST['db-password']);
if ($dbConn){
  $success = true;
  $queryArray = array('DROP TABLE IF EXISTS `%1\sconfig`, `%1\simggen`, `%1\sposts`, `%1\susers`', 
  '
  CREATE TABLE IF NOT EXISTS `%1\sconfig` (
  `name` varchar(20) NOT NULL,
  `value` varchar(500) NOT NULL,
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8',
 '
 INSERT INTO `%1\sconfig` (`name`, `value`) VALUES
(\'banner\', \'Project Gy\'),
(\'subbanner\', \'Yet another lyric blog\'),
(\'title\', \'Project Gy\')',
'DROP TABLE IF EXISTS `%1\simggen`',
'
CREATE TABLE IF NOT EXISTS `%1\simggen` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lyric` text NOT NULL,
  `meta` varchar(300) NOT NULL,
  `style` varchar(5) NOT NULL,
  `font` varchar(50) NOT NULL,
  `background` varchar(50) NOT NULL,
  `size` int(10) NOT NULL,
  `lineheight` int(10) NOT NULL,
  `metasize` int(10) NOT NULL,
  `metalineh` int(10) NOT NULL,
  `width` int(10) NOT NULL,
  `height` int(10) NOT NULL,
  `textcolor` varchar(5) NOT NULL,
  `x_offset` int(10) NOT NULL,
  `y_offset` int(10) NOT NULL,
  `bgpos` int(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=10',
'DROP TABLE IF EXISTS `%1\sposts`',
'
CREATE TABLE IF NOT EXISTS `%1\sposts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lyric` text NOT NULL,
  `name` varchar(200) NOT NULL,
  `artist` varchar(200) NOT NULL,
  `featuring` varchar(100) NOT NULL,
  `album` varchar(200) NOT NULL,
  `origin` text NOT NULL,
  `translate` text NOT NULL,
  `translator` varchar(200) NOT NULL,
  `comment` text NOT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  FULLTEXT KEY `lyric` (`lyric`),
  FULLTEXT KEY `name` (`name`),
  FULLTEXT KEY `artist` (`artist`),
  FULLTEXT KEY `featuring` (`featuring`),
  FULLTEXT KEY `album` (`album`),
  FULLTEXT KEY `origin` (`origin`),
  FULLTEXT KEY `translate` (`translate`),
  FULLTEXT KEY `translator` (`translator`),
  FULLTEXT KEY `comment` (`comment`),
  FULLTEXT KEY `comment_2` (`comment`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=32 ',
'DROP TABLE IF EXISTS `%1\susers`',
'
CREATE TABLE IF NOT EXISTS `%1\susers` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `username` varchar(20) NOT NULL,
  `password` char(32) NOT NULL,
  `email` varchar(60) NOT NULL,
  `display_name` varchar(200) NOT NULL,
  `role` int(2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=2 ');

foreach ($queryArray as $queryItem) {
  $quertString = sprintf($queryItem,mysql_escape_string($_POST['db-prefix']));
  result = mysql_query($query);
  $success = $success && $result;
}
$queryUser = '
 INSERT INTO `%1\susers` (`name`, `value`) VALUES
(\'username\', \'%2\s\'),
(\'password\', \'%3\s\'),
(\'email\', \'%4\s\'),
(\'display_name\', \'%5\s\'),
(\'role\', \'3\')';
$quertString = sprintf($queryUser,mysql_escape_string($_POST['db-prefix']),
                                  mysql_escape_string($_POST['admin-username']),
                                  md5(md5(mysql_escape_string($_POST['admin-password']))),
                                  mysql_escape_string($_POST['admin-email']),
                                  mysql_escape_string($_POST['admin-displayname']));
  result = mysql_query($query);
  $success = $success && $result;
}else{
  echo "Database connection error. "mysql_errno()." : ".mysql_error();
}

echo "Please remove /install folder."
?>
      </textarea>
      <div class="footer">
        <p>&copy; Blueset Studio 2014</p>
      </div>

    </div> 

</body>

