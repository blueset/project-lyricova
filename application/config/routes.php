<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');
/*
| -------------------------------------------------------------------------
| URI ROUTING
| -------------------------------------------------------------------------
| This file lets you re-map URI requests to specific controller functions.
|
| Typically there is a one-to-one relationship between a URL string
| and its corresponding controller class/method. The segments in a
| URL normally follow this pattern:
|
|	example.com/class/method/id/
|
| In some instances, however, you may want to remap this relationship
| so that a different class/function is called than the one
| corresponding to the URL.
|
| Please see the user guide for complete details:
|
|	http://codeigniter.com/user_guide/general/routing.html
|
| -------------------------------------------------------------------------
| RESERVED ROUTES
| -------------------------------------------------------------------------
|
| There area two reserved routes:
|
|	$route['default_controller'] = 'welcome';
|
| This route indicates which controller class should be loaded if the
| URI contains no data. In the above example, the "welcome" class
| would be loaded.
|
|	$route['404_override'] = 'errors/page_missing';
|
| This route will tell the Router what URI segments to use if those provided
| in the URL cannot be matched to a valid route.
|
*/


//$route['post']="main/post";
$route['register']="user/register";
$route['login']="user/login";
$route['logout']="user/logout";
$route['default_controller'] = "main";
$route['page'] = "main/page";
$route['page/(:num)'] = "main/index/$1";
//$route['edit/(:num)'] = "main/edit/$1";
$route['post/(:num)'] = "main/single/$1";
$route['delete/(:num)'] = "main/delete/$1";
$route['error/(:num)'] = "main/error/$1";
$route['s'] = "main/search";
$route['admin/edit'] = "main/p404";
$route['404_override'] = "main/p404";


//$route['imggen/(:num)/(:num)'] = "main/image_gen/$1/$2";
//$route['imggen/(:num)'] = "main/image_gen/$1/1";
$route['imggen/new'] = "imggen/newimg";
$route['imggen/new/(:num)'] = "imggen/newimg/$1";
$route['imggen/edit/(:num)'] = "imggen/editimg/$1";
$route['imggen/output'] = "imggen/output";
$route['imggen/help'] = "imggen/help";
$route['imggen/output/(:num).png'] = "imggen/output/$1";
$route['imggen/getpostxml/(:num).xml'] = "main/getpostxml/$1";
/*$route['404_override'] = '';*/

/*$route['news/create'] = 'news/create';
$route['news/(:any)'] = 'news/view/$1';
$route['news'] = 'news';*/
/*$route['page/(:any)'] = 'main/index';*/
/*$route['default_controller'] = 'news';*/


/* End of file routes.php */
/* Location: ./application/config/routes.php */