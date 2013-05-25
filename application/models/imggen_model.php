<?php 
class imggen_model extends CI_Model {

  public function __construct(){
    parent::__construct();
    $this->load->database();
  }
  function imagettftext_ca(&$im, $size, $angle, $x, $y, $color, $fontfile, $text)
  {
    $bbox = imagettfbbox($size, $angle, $fontfile, $text);
    $dx = ($bbox[2]-$bbox[0])/2.0 - ($bbox[2]-$bbox[4])/2.0;
    $dy = ($bbox[3]-$bbox[1])/2.0 + ($bbox[7]-$bbox[1])/2.0;
    $px = $x-$dx;
    $py = $y-$dy;
    return imagettftext($im, $size, $angle, $px, $py, $color, $fontfile, $text);
  }
  function imagettftext_ra(&$im, $size, $angle, $x, $y, $color, $fontfile, $text)
  {
    $bbox = imagettfbbox($size, $angle, $fontfile, $text);
    $dx = ($bbox[4]-$bbox[6]);
    $dy = $size;
    $px = $x-$dx;
    $py = $y-$dy;
    return imagettftext($im, $size, $angle, $px, $py, $color, $fontfile, $text);
  }
  public function imggen_01($string="Lyrics not found.",$size = 45,$lineheight = 70,$font = "./fonts/w6.ttf",$meta = "Error 404. (Not actually :P)",$metasize = 15, $metalineh = 30)
  {
  	$x_offset = 30;
    $y_offset = 10;
  	$bg_src = './img/bg/bg01.png';
    $logo_src ='./img/bg/wtm-l-w.png';
    $logo = ImageCreateFromPNG($logo_src);
    $bg = ImageCreateFromPNG($bg_src);
    $lineacuu = $lineheight + $y_offset;
    list($bg_w, $bg_h, $bg_type, $bg_attr) = getimagesize($bg_src);
    $white = imagecolorallocate($bg, 255, 255, 255); 
    $strings = explode("\n", $string);
    foreach($strings as $line){
      $this->imagettftext_ra($bg, $size, 0, ($bg_w-$x_offset), ($size + $lineacuu), $white, $font, $line);
      $lineacuu += $lineheight;
    }
    $lineacuu -= $lineheight;
    $lineacuu += $metalineh - $metasize;
    $this->imagettftext_ra($bg, $metasize, 0, ($bg_w-$x_offset), ($size + $lineacuu), $white, $font, $meta);
    $lineacuu += $metalineh;

    ImageAlphaBlending($bg, true);
    $logoW = ImageSX($logo);
    $logoH = ImageSY($logo);
    imageline($bg,0,($lineacuu +10),1500,($lineacuu+10),$white);
    imageline($bg,(($bg_w-$x_offset)+10),0,(($bg_w-$x_offset)+10),900,$white);
    ImageCopy($bg, $logo, (($bg_w-$x_offset)-$logoW), ($lineacuu+20), 0, 0, $logoW, $logoH);
    ImagePng($bg); // output to browser
    ImageDestroy($bg);
    ImageDestroy($logo);
  }
 }