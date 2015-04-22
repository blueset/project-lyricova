<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');
class imggen_model extends CI_Model 
{
  
  protected $default_array = array(
      "string" => "Enter your own lyric.",
      "size" => 35,
      "lineheight" => 50,
      "font" => "./fonts/DroidSansFallback.ttf",
      "meta" => "Project Gy Picture Generation",
      "metasize" => 10, 
      "metalineh" => 25, 
      "bg_src" => "./img/bg/bg1.png",
      "textcolor" => "ffffff",
      "width" => 640,
      "height" => 596, 
      "x_offset" => 30,
      "y_offset" => 30,
      "position" => 5,
      "bgpos" => 5,
      "write_meta" => false,
      "write_logo" => false,
      "write_url" => false,
      "new_font" => false
      );

  public function __construct(){
    parent::__construct();
    $this->load->database();
    putenv('GDFONTPATH=' . realpath('.'));
    
  }

  function imagettftext_ca(&$im, $size, $angle, $x, $y, $color, $fontfile, $text)
  {
    $bbox = imagettfbbox($size, $angle, $fontfile, $text);
    $dx = ($bbox[2]-$bbox[0])/2.0 - ($bbox[2]-$bbox[4])/2.0;
    $dy = ($bbox[3]-$bbox[1])/2.0 + ($bbox[7]-$bbox[1])/2.0;
    $px = $x-$dx;
    $py = $y/*-$dy*/;
    return imagettftext($im, $size, $angle, $px, $py, $color, $fontfile, $text);
  }
  function imagettftext_ra(&$im, $size, $angle, $x, $y, $color, $fontfile, $text)
  {
    $bbox = imagettfbbox($size, $angle, $fontfile, $text);
    $dx = ($bbox[4]-$bbox[6]);
    $dy = $size;
    $px = $x-$dx;
    $py = $y/*-$dy*/;
    return imagettftext($im, $size, $angle, $px, $py, $color, $fontfile, $text);
  }
  public function imggen($config_array=array()
    /*$string = "Enter your own lyric.",
                         $size = 35,
                         $lineheight = 50,
                         $font = "./fonts/DroidSansFallback.ttf",
                         $meta = "Project Gy Picture Generation",
                         $metasize = 10, 
                         $metalineh = 25, 
                         $bg_src = "./img/bg/bg1.png",
                         $textcolor = "w",
                         $width=640,
                         $height=596, 
                         $x_offset = 30,
                         $y_offset = 30,
                         $position="cc",
                         $bgpos = 5*/){
    //$this->default_array["write_meta"] = true;
    //$this->default_array["write_logo"] = true;
    extract($this->default_array);
    extract($config_array);
    $write_meta = true;
    $write_logo = true;

    // Load BG.
   
    $bg = ImageCreateFromPNG($bg_src);
    //Crop Bg
    $bgcrop = $this->crop_image($bg,$bgpos,$width,$height); 
    ImageDestroy($bg);

    
    
    $this->write_text($bgcrop, $config_array);

    ImagePng($bgcrop);
    ImageDestroy($bgcrop);
  }

  function write_text(&$bgcrop, $config_array) 
  {
    putenv('GDFONTPATH=' . realpath('.'));
    extract($this->default_array);
    extract($config_array);

    if (!$new_font) $font = $this->get_font($font,true);

    

    // temporary px to pt
    $size = $this->font_size_to_px($size);
    $metasize = $this->font_size_to_px($metasize);

    //String of source
    $strings = explode("\n", $string);
    $position = $this->convert_old_position_string($position);

    if($write_logo){
      //Size of Logo
      switch ($position % 3) {
      case 1:
        $Xposition = "l";
        break;
      case 2:
        $Xposition = "c";
        break;
      case 0:
        $Xposition = "r";
        break;
      default:
        $Xposition = "c";
        break;
      }
      $logoColor = $this->convert_logo_color_code($textcolor);
      $logo_src ='./img/bg/wtm-'.$Xposition.'-'.$logoColor.'.png';
      $logo = ImageCreateFromPNG($logo_src);
      $logoW = ImageSX($logo);
      $logoH = ImageSY($logo);
      $logoMarginTop = 20;
    }else{
      $logoH = 0;
      $logoW = 0;
      $logoMarginTop = 0;
    }
    if(!$write_meta){
      $metalineh = 0;
    }
    
    if(isset($font_name)){$font = $this->get_font_path($font_name);}

    //Determine Anchor 
    if    ($position % 3 == 1){$anchorX = $x_offset;} //Horiz. left
    elseif($position % 3 == 2){$anchorX = $width / 2;} //Horiz. Center
    elseif($position % 3 == 0){$anchorX = $width - $x_offset;} //Horiz Right
    if    (floor(($position - 1) / 3) == 0){$anchorY = $y_offset;} //Vert. Top
    elseif(floor(($position - 1) / 3) == 1){$anchorY = ($height / 2)-(($lineheight * count($strings) + $metalineh + $logoMarginTop +$logoH)/2);} //Vert. Center
    elseif(floor(($position - 1) / 3) == 2){$anchorY = $height - ($lineheight * count($strings) + $metalineh + $logoMarginTop + $logoH + $y_offset);} //Vert. Bottom
    $lineacuu = $anchorY + $size;
    //var_dump($lineacuu);
    
    $metalineh *= $write_meta;
    $metasize *= $write_meta;

    //Color
    //TODO: Color assignment;
    $textcolor = $this->convert_old_color_code($textcolor);
    $color = imagecolorallocate($bgcrop, hexdec($textcolor[0].$textcolor[1]),
                                         hexdec($textcolor[2].$textcolor[3]),
                                         hexdec($textcolor[4].$textcolor[5]));    
   
    
    foreach($strings as $line){
      if    ($position % 3 == 1){imagettftext($bgcrop, $size, 0, ($anchorX), ($lineacuu), $color, $font, $line);}//Horiz. left
      elseif($position % 3 == 2){$this->imagettftext_ca($bgcrop, $size, 0, ($anchorX), ($lineacuu), $color, $font, $line);} //Horiz. Center
      elseif($position % 3 == 0){$this->imagettftext_ra($bgcrop, $size, 0, ($anchorX), ($lineacuu), $color, $font, $line);} //Horiz Right
      
      $lineacuu += $lineheight;
    }


    if ($write_meta) {
      $lineacuu += $metalineh - $lineheight;
    
      //imageline($bgcrop,0,($lineacuu),200,($lineacuu),$color);
      if    ($position % 3 == 1){imagettftext($bgcrop, $metasize, 0, ($anchorX), ($lineacuu), $color, $font, $meta);}//Horiz. left
      elseif($position % 3 == 2){$this->imagettftext_ca($bgcrop, $metasize, 0, ($anchorX), ($lineacuu), $color, $font, $meta);} //Horiz. Center
      elseif($position % 3 == 0){$this->imagettftext_ra($bgcrop, $metasize, 0, ($anchorX), ($lineacuu), $color, $font, $meta);}
      // imageline($bgcrop,0,($lineacuu+10),1500,($lineacuu+10),$color);
    }

    if($write_logo){
      ImageAlphaBlending($bgcrop, true);
      if    ($position % 3 == 1){$logoX = $x_offset;}//Horiz. left
      elseif($position % 3 == 2){$logoX = $width / 2 - $logoW/2;} //Horiz. Center
      elseif($position % 3 == 0){$logoX = $width - $x_offset - $logoW;}
      ImageCopy($bgcrop, $logo, ($logoX), ($lineacuu + 20), 0, 0, $logoW, $logoH);
    }
    if($write_url){
      $this->imagettftext_ra($bgcrop, 8, 0, (ImageSX($bgcrop)-10), (ImageSY($bgcrop)-14), $color, $font, base_url());
    }
  }
  public function imggen_dynm($setting) //$string = "Enter your own lyric.",
  //                        $size = 35,
  //                        $lineheight = 50,
  //                        $font = "./fonts/DroidSansFallback.ttf",
  //                        $meta = "Project Gy Picture Generation",
  //                        $metasize = 10, 
  //                        $metalineh = 25, 
  //                        $bg_src = "./img/bg/bg1.png",
  //                        $textcolor = "w",
  //                        $width=640,
  //                        $height=596, 
  //                        $x_offset = 30,
  //                        $y_offset = 30,
  //                        $position="cc",
  //                        $local_add = "http://github.com/1a23/project-gy")
  {
    // pre-process
    // extract($this->default_array);
    // extract($setting);
    $setting['write_meta'] = true;
    $setting['write_logo'] = false;
    $setting['write_url'] = true;
    $bg_src = $this->get_dynamic_bg($setting['id']);

    $setting['textcolor'] = substr($setting['color'],1);
    $setting['size'] = $this->get_dyna_size($setting);
    // truncate text
    if ($setting['size'] == $setting['min_size']){
      $max_line = intval(($setting['height']-($setting['metasize']*$setting['metalineh'])/($setting['size']*$setting['lineheight'])));
      $curr_line = 1 + substr_count($setting['string'], "\n");
      if ($max_line > $curr_line){
        $i = 0;
        $count = 0;
        while ($count <= $max_line){
        // while ($i < 20){
          $i++;
          $setting['string'] = str_replace(array("\r\n","\r","\n"), "\n", $setting['string']);
          $count = strpos($setting['string'],"\n", $count+1);

        }
        $setting['string'] = substr($setting['string'],0,$count);
      }
    }

    $setting['lineheight'] = intval($setting['lineheight']*$setting['size']);
    $setting['metalineh'] = intval($setting['metalineh']*$setting['metasize']);

    // Load BG.
    $bg = ImageCreateFromPNG($bg_src);
    
    $this->write_text($bg, $setting);

    ImagePng($bg);
    ImageDestroy($bg);
    
    // $logo_src ='./img/bg/wtm-'.$position[1].'-'.$textcolor.'.png';
    // $logo = ImageCreateFromPNG($logo_src);
    // $bgcrop = imagecreatetruecolor($width,$height);
    // $bgW = ImageSX($bg);
    // $bgH = ImageSY($bg);
    // $bgpos = 9;

    // if ($bgpos == 1||$bgpos == 2||$bgpos == 3){$src_y = 0;}
    //   elseif ($bgpos == 4||$bgpos == 5||$bgpos == 6){$src_y = ($bgH - $height)/2;}
    //   else{$src_y = $bgH - $height;}

    // if ($bgpos == 1||$bgpos == 4||$bgpos == 7){$src_x = 0;}
    //   elseif ($bgpos == 2||$bgpos == 5||$bgpos == 8){$src_x = ($bgW - $width)/2;}
    //   else{$src_x = $bgW - $width;}

    // imagecopyresized($bgcrop,$bg,0,0,$src_x,$src_y,$width,$height,$width,$height);
    // ImageDestroy($bg);
    // // $logoW = ImageSX($logo);
    // // $logoH = ImageSY($logo);
    // $strings = explode("\n", $string);
    // $color = ($textcolor == "b") ? imagecolorallocate($bgcrop, 0, 0, 0) : imagecolorallocate($bgcrop, 255, 255, 255); 
    // if ($position[1]=="l"){$anchorX = $x_offset;}//Horiz. left
    // elseif($position[1]=="c"){$anchorX = $width / 2;} //Horiz. Center
    // elseif($position[1]=="r"){$anchorX = $width - $x_offset;} //Horiz Right

    // if ($position[0]=="t"){$anchorY = $y_offset;} //Vert. Top
    // elseif($position[0]=="c"){$anchorY = ($height / 2)-(($lineheight * count($strings) + $metalineh + 20+$logoH)/2);} //Vert. Center
    // elseif($position[0]=="b"){$anchorY = $height - ($lineheight * count($strings) + $metalineh + 20 + $logoH + $y_offset);} //Vert. Bottom
    // $lineacuu = $anchorY + $lineheight;
    // //imageline($bgcrop,0,($lineacuu),300,($lineacuu),$color);
    // foreach($strings as $line){
    //   if ($position[1]=="l"){imagettftext($bgcrop, $size, 0, ($anchorX), ($lineacuu), $color, $font, $line);}//Horiz. left
    //   elseif($position[1]=="c"){$this->imagettftext_ca($bgcrop, $size, 0, ($anchorX), ($lineacuu), $color, $font, $line);} //Horiz. Center
    //   elseif($position[1]=="r"){$this->imagettftext_ra($bgcrop, $size, 0, ($anchorX), ($lineacuu), $color, $font, $line);} //Horiz Right
      
    //   $lineacuu += $lineheight;
    // }

    // $lineacuu += $metalineh - $lineheight;
    
    // //imageline($bgcrop,0,($lineacuu),200,($lineacuu),$color);
    // if ($position[1]=="l"){imagettftext($bgcrop, $metasize, 0, ($anchorX), ($lineacuu), $color, $font, $meta);}//Horiz. left
    // elseif($position[1]=="c"){$this->imagettftext_ca($bgcrop, $metasize, 0, ($anchorX), ($lineacuu), $color, $font, $meta);} //Horiz. Center
    // elseif($position[1]=="r"){$this->imagettftext_ra($bgcrop, $metasize, 0, ($anchorX), ($lineacuu), $color, $font, $meta);}
    
    // ImagePng($bgcrop);
  }
  public function add_img()
  {
    $data = array(
    'lyric' => $this->input->post('lyric'),
    'meta' => $this->input->post('meta'),
    'style' => $this->input->post('style'),
    'font' => $this->input->post('font'),
    'background' => $this->input->post('background'),
    'size' => $this->input->post('size'),
    'lineheight' => $this->input->post('lineheight'),
    'metasize' => $this->input->post('metasize'),
    'metalineh' => $this->input->post('metalineh'),
    'width' => $this->input->post('width'),
    'height' => $this->input->post('height'),
    'x_offset' => $this->input->post('x_offset'),
    'y_offset' => $this->input->post('y_offset'),
    'bgpos' => $this->input->post('bgpos'),
    'textcolor' => $this->input->post('textcolor')
    );
  
    $this->db->insert('imggen', $data);
    return $this->db->insert_id();
  }
  public function edit_img($img_id){
    $data = array(
    'lyric' => $this->input->post('lyric'),
    'meta' => $this->input->post('meta'),
    'style' => $this->input->post('style'),
    'font' => $this->input->post('font'),
    'background' => $this->input->post('background'),
    'size' => $this->input->post('size'),
    'lineheight' => $this->input->post('lineheight'),
    'metasize' => $this->input->post('metasize'),
    'metalineh' => $this->input->post('metalineh'),
    'width' => $this->input->post('width'),
    'height' => $this->input->post('height'),
    'x_offset' => $this->input->post('x_offset'),
    'y_offset' => $this->input->post('y_offset'),
    'bgpos' => $this->input->post('bgpos'),
    'textcolor' => $this->input->post('textcolor')
    );
  
    $this->db->where('id', $img_id);
    
    $this->db->update('imggen', $data);
    return 0;
  }
  public function get_by_id($id)
  {
    $query = $this->db->get_where('imggen', array('id' => $id));
    if($this->db->affected_rows()>0){
      return $query->row();
    }else{
      return false;
    }
  }
  public function imggen_db($img_id)
  {
    $fname = $this->config->item('fname');
    $fpath = $this->config->item('fpath');
    $post = $this->get_by_id($img_id);

    $bgpath = "./img/bg/bg".$post->background.".png";
    $config_array = array(
      "string" => $post->lyric,
      "size" => $post->size,
      "lineheight" => $post->lineheight,
      "font" => str_replace($fname,$fpath,$post->font),
      "meta" => $post->meta,
      "metasize" => $post->metasize, 
      "metalineh" => $post->metalineh, 
      "bg_src" => $bgpath,
      "textcolor" => $post->textcolor,
      "width" => $post->width,
      "height" => $post->height, 
      "x_offset" => $post->x_offset,
      "y_offset" => $post->y_offset,
      "position" => $post->style,
      "bgpos" => $post->bgpos,
      "write_meta" => true,
      "write_logo" => true
      );
    $this->imggen($config_array);
  }
  public function get_image_number($user_id=-1){
    if($user_id !== -1){$this->db->where('user_id', $user_id);}
    return $this->db->count_all('imggen');
  }
  public function get_image($per_page=20,$offset=0,$user_id=-1){ 
    $this->db->order_by("id", "desc");
    if($user_id !== -1){$this->db->where('user_id', $user_id);}
    $query = $this->db->get('imggen',$per_page,$offset);
    return $query->result();
  }
  public function delete_image($id)
  {
    $this->db->where('id', $id);
    $this->db->delete('imggen');
    if($this->db->affected_rows()==0){
      return false;
    }else{
      return true;
    }
  }

  public function font_delete($font_name)
  {
    //del DB item
    $this->db->where('name', $font_name);
    $this->db->delete('fonts');
    $result = ($this->db->affected_rows()==0);
    //del file
    array_map('unlink', glob("./fonts/".$font_name.".*"));
    array_map('unlink', glob("./fonts/preview/".$font_name."-*.png"));
    $this->load->helper('file');
    if ($result){
      return false;
    }else{
      return true;
    }
  }
  public function font_validate($filePath)
  {
    $mimeTypes = array('font/ttf','font/truetype','application/x-font-ttf', "application/vnd.ms-opentype", 'application/x-font-opentype',"font/opentype");
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $filePath);
    $return = false;
    if(in_array($mime, $mimeTypes)){
      $return = true;
    }
    finfo_close($finfo);
    return $return ? true : false;
  }
  /**
   * Crop Image
   * Corp image and return new image
   * @param  image $bg
   * @param  int $bgpos
   * @param  int $width
   * @param  int $height
   * @return image corped
   */
  function crop_image($bg, $bgpos, $width, $height)
  {
    $bgcrop = imagecreatetruecolor($width,$height);
    $bgW = ImageSX($bg);
    $bgH = ImageSY($bg);

    if (($bgpos - 1) / 3 == 0 ){$src_y = 0;}
      elseif (($bgpos - 1) / 3 == 1){$src_y = ($bgH - $height)/2;}
      else{$src_y = $bgH - $height;}

    if ($bgpos % 3 == 1){$src_x = 0;}
      elseif ($bgpos % 3 == 2){$src_x = ($bgW - $width)/2;}
      else{$src_x = $bgW - $width;}

    imagecopyresized($bgcrop,$bg,0,0,$src_x,$src_y,$width,$height,$width,$height);
    return $bgcrop;
  }

  /**
   * FOR COMPATIABILITY TO OLD IMGGEN FORMAT
   */


  /**
   * convert_logo_color_code
   * Convert hex code string (without #) to logo color
   * @param  string $hex
   * @return char "ffffff" for white (bright color), "000000" for black (dark color);
   */
  function convert_logo_color_code($hex)
  {
    if(count($hex)<6){$hex=$this->convert_old_color_code($hex);}
    //break up the color in its RGB components
    $r = hexdec(substr($hex,0,2));
    $g = hexdec(substr($hex,2,2));
    $b = hexdec(substr($hex,4,2));

    //do simple weighted avarage
    //
    //(This might be overly simplistic as different colors are perceived
    // differently. That is a green of 128 might be brighter than a red of 128.
    // But as long as it's just about picking a white or black text color...)
    if($r + $g + $b > 382){
      return "ffffff";
      //bright color, use dark font
    }else{
      return "000000";
      //dark color, use bright font
    }
  }
  /**
   * Convert old color code to hex code.
   * convert if count($oldColorCode) < 6
   * @param  string $oldColorCode
   * @return string
   */
  function convert_old_color_code($oldColorCode)
  {
    if(strlen($oldColorCode) < 6){
      switch ($oldColorCode) {
        case 'w':
          return "ffffff";
          break;

        case 'b':
          return "000000";
          break;
          
        default:
          return "ffffff";
          break;
      }
    }else{
      return $oldColorCode;
    }
  }

  /**
   * Convert old position string to new position int
   *  1\0 | l  c  r
   *  -------------
   *   t  | 1  2  3
   *   c  | 4  5  6
   *   b  | 7  8  9
   * @param  str $oldPositionString
   * @return int
   */
  function convert_old_position_string($oldPositionString)
  {
    if(!is_numeric($oldPositionString)){
      switch ($oldPositionString) {
        case 'tl':
          return 1;
          break;
        case 'tc':
          return 2;
          break;
        case 'tr':
          return 3;
          break;
        case 'cl':
          return 4;
          break;
        case 'cc':
          return 5;
          break;
        case 'cr':
          return 6;
          break;
        case 'bl':
          return 7;
          break;
        case 'bc':
          return 8;
          break;
        case 'br':
          return 9;
          break;
        default:
          return 5;
          break;
      }
    }
    return $oldPositionString;
  }
  function get_font_path($font_name)
  {
    return glob("./fonts/".$font_name.".*")[0];
  }
  public function imggen_fontPreview($text,$path,$pngName)
  {
    extract($this->default_array);
    $config_array = array("string" => $text,
                          "font" => glob("./fonts/".$path.".*")[0],
                          "write_logo" => false,
                          "write_meta" => false,
                          "position" => 4,
                          "textcolor" => "000000",
                          "size" => 25,
                          "lineheight" =>20,
                          "width"=>450,
                          "height"=>50,
                          "x_offset"=>10,
                          "y_offset"=>0,
                          "new_font"=>true);

    // Create a 55x30 image
    $im = imagecreatetruecolor(450, 50);
    $white = imagecolorallocate($im, 0, 0, 0);
    //imagealphablending($im,true);
    imagesavealpha($im,true);
    imagealphablending($im,false);
    $col=imagecolorallocatealpha($im,0,0,0,127);
    imagefilledrectangle($im,0,0, 450, 50,$col);
    imagealphablending($im,true);
    //imagefilledrectangle($im, 0, 0, 450, 50, $white);

    $this->write_text($im, $config_array);
    // Save the image
    // header ("Content-type: image/png");
    // var_dump($config_array);
    // ImagePng($im);
    // exit;
    imagepng($im, './fonts/preview/'.$pngName);
    imagedestroy($im);
  }
  public function get_font($font_name="",$is_path=false)
  {
    $query = $this->db->get_where('fonts',array('name'=>$font_name));
    if($query->num_rows() === 0) $query = $this->db->get('fonts',1);
    if($query->num_rows() === 0) return false;
    if($is_path) return $this->get_font_path($query->row()->name);
    return $query->row()->name;
  }
  public function get_dynamic_bg($id,$is_path = true){
    if (file_exists('./img/dyna-bg/bg_'.(string)$id.'.png'))return $is_path ? './img/dyna-bg/bg_'.(string)$id.'.png' : 'bg_'.(string)$id.'.png';
    if (file_exists('./img/dyna-bg/dyna-default.png')) return $is_path ? './img/dyna-bg/dyna-default.png' : 'dyna-default.png';
    return false;
  }

  function get_dyna_size($setting){
    $bbox = imagettfbbox($this->font_size_to_px($setting['size']), 0, $this->get_font($setting['font'],true), $setting['string']);
    $bbox_width = abs($bbox[4] - $bbox[0]);
    $bbox_height = $setting['size']*$setting['lineheight']*(1+substr_count($setting['string'], "\n"));
    $setting['height'] -= $setting['metasize']*$setting['metalineh'];
    $box_size = (int)min($setting['size'] * $setting['width']  / $bbox_width,
                    $setting['size'] * $setting['height'] / $bbox_height);

    if ($box_size > $setting['max_size']) return $setting['max_size'];
    if ($box_size < $setting['min_size']) return $setting['min_size'];
    if (($bbox_height <= $setting['height']) && ($bbox_width <= $setting['width'])) return $setting['size'];
    return $box_size;
  }
  function font_size_to_px($size){
    return $size*3/4;
  }
 }