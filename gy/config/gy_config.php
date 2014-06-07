<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');

//======== Image Generator ========
//FONT Configuration
//!Caution! Settings should be arranged respectively.
//fName - a short name for fonts
// only small letters and numbers are suggested. 
 $config['fname'] = array("yanoneThin",
                 		  "yanoneRegular",
                   		  "w6",
                   		  "ltxh");
//fCapt - Display name for fonts
 $config['fcapt'] = array("Yanone Thin (Europe)",
                 		  "Yanone Regular (Europe)",
                   		  "Hiragino Sans W6 (CJ)",
                   		  "Lanting Light (Chinese)");
 //fPath - Path for font files.
 $config['fpath'] = array("./fonts/YanoneKaffeesatz-Thin.ttf",
                   		  "./fonts/YanoneKaffeesatz-Regular.ttf",
                   		  "./fonts/w6.ttf",
                   		  "./fonts/FZLTXH.ttf");
 //defaultF - "fname" of default font
 $config['defaultf'] = "w6";

 // BGnumber - total number of background pictures.
 $config['bgnumber'] = 5;

//======== Comment Setting ========

 // disqus-sName - a "short name" for disquz comments.
 // For more information, please visit [Disqus](http://disqus.com/)
 // To get a Disqus short name, please [register](http://disqus.com/admin/create/).
 $config['disqus_sname'] = "";

