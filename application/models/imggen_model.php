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
  public function imggen($string = "Enter your own lyric.",
                         $size = 35,
                         $lineheight = 50,
                         $font = "./fonts/w6.ttf",
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
                         $bgpos = 5){

    $logo_src ='./img/bg/wtm-'.$position[1].'-'.$textcolor.'.png';
    $logo = ImageCreateFromPNG($logo_src);
    $bg = ImageCreateFromPNG($bg_src);
    $bgcrop = imagecreatetruecolor($width,$height);
    $bgW = ImageSX($bg);
    $bgH = ImageSY($bg);

    if ($bgpos == 1||$bgpos == 2||$bgpos == 3){$src_y = 0;}
      elseif ($bgpos == 4||$bgpos == 5||$bgpos == 6){$src_y = ($bgH - $height)/2;}
      else{$src_y = $bgH - $height;}

    if ($bgpos == 1||$bgpos == 4||$bgpos == 7){$src_x = 0;}
      elseif ($bgpos == 2||$bgpos == 5||$bgpos == 8){$src_x = ($bgW - $width)/2;}
      else{$src_x = $bgW - $width;}

    imagecopyresized($bgcrop,$bg,0,0,$src_x,$src_y,$width,$height,$width,$height);
    ImageDestroy($bg);
    $logoW = ImageSX($logo);
    $logoH = ImageSY($logo);
    $strings = explode("\n", $string);
    $color = ($textcolor == "b") ? imagecolorallocate($bgcrop, 0, 0, 0) : imagecolorallocate($bgcrop, 255, 255, 255); 
    if ($position[1]=="l"){$anchorX = $x_offset;}//Horiz. left
    elseif($position[1]=="c"){$anchorX = $width / 2;} //Horiz. Center
    elseif($position[1]=="r"){$anchorX = $width - $x_offset;} //Horiz Right

    if ($position[0]=="t"){$anchorY = $y_offset;} //Vert. Top
    elseif($position[0]=="c"){$anchorY = ($height / 2)-(($lineheight * count($strings) + $metalineh + 20+$logoH)/2);} //Vert. Center
    elseif($position[0]=="b"){$anchorY = $height - ($lineheight * count($strings) + $metalineh + 20 + $logoH + $y_offset);} //Vert. Bottom
    $lineacuu = $anchorY + $lineheight;
    //imageline($bgcrop,0,($lineacuu),300,($lineacuu),$color);
    foreach($strings as $line){
      if ($position[1]=="l"){imagettftext($bgcrop, $size, 0, ($anchorX), ($lineacuu), $color, $font, $line);}//Horiz. left
      elseif($position[1]=="c"){$this->imagettftext_ca($bgcrop, $size, 0, ($anchorX), ($lineacuu), $color, $font, $line);} //Horiz. Center
      elseif($position[1]=="r"){$this->imagettftext_ra($bgcrop, $size, 0, ($anchorX), ($lineacuu), $color, $font, $line);} //Horiz Right
      
      $lineacuu += $lineheight;
    }

    $lineacuu += $metalineh - $lineheight;
    
    //imageline($bgcrop,0,($lineacuu),200,($lineacuu),$color);
    if ($position[1]=="l"){imagettftext($bgcrop, $metasize, 0, ($anchorX), ($lineacuu), $color, $font, $meta);}//Horiz. left
    elseif($position[1]=="c"){$this->imagettftext_ca($bgcrop, $metasize, 0, ($anchorX), ($lineacuu), $color, $font, $meta);} //Horiz. Center
    elseif($position[1]=="r"){$this->imagettftext_ra($bgcrop, $metasize, 0, ($anchorX), ($lineacuu), $color, $font, $meta);}
    imageline($bgcrop,0,($lineacuu+10),1500,($lineacuu+10),$color);
    ImageAlphaBlending($bgcrop, true);
    if ($position[1]=="l"){$logoX = $x_offset;}//Horiz. left
    elseif($position[1]=="c"){$logoX = $width / 2 - $logoW/2;} //Horiz. Center
    elseif($position[1]=="r"){$logoX = $width - $x_offset - $logoW;}
    ImageCopy($bgcrop, $logo, ($logoX), ($lineacuu + 20), 0, 0, $logoW, $logoH);
    ImagePng($bgcrop);
  }
  public function add_img(){
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
    //var_dump($post);
    $this->imggen($post->lyric,
                  $post->size,
                  $post->lineheight,
                  str_replace($fname,$fpath,$post->font),
                  $post->meta,
                  $post->metasize, 
                  $post->metalineh, 
                  $bgpath,
                  $post->textcolor,
                  $post->width,
                  $post->height,
                  $post->x_offset,
                  $post->y_offset,
                  $post->style,
                  $post->bgpos);
  }
 }