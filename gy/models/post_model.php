<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');
class post_model extends CI_Model {

  public function __construct(){
    parent::__construct();
    $this->load->database();
  }
  public function post_item(){
      $this->load->helper('url');
      $this->load->helper('date');
      $timenow = date("Y-m-d H:i:s");
      $language = $this->input->post("lang");
      $language['main'] = $this->input->post("main");
      $language['orig'] = $this->input->post("original");
      $romanize = ["zh"=>"[]", "ja"=>"[]"];
      if (count($language['zh']) > 0){
          $romanize['zh'] = json_decode($this->romanize('zh', $language['zh']));
      }
      if (count($language['ja']) > 0){
          $romanize['ja'] = json_decode($this->romanize('ja', $language['ja']));
      }
      $main = $language[$language['main']];
      $orig = "";
      if ($language['main'] != $language['orig']){
          $orig = $language[$language['orig']];
      }
      $trans = "";
      foreach (["ja", "zh", "en"] as $lcode){
          if ($lcode != $language['orig'] && $lcode != $language['main']){
              $trans .= $language[$lcode];
          }
      }
      $data = array(
        'lyric' => $main,
        'name' => $this->input->post('name'),
        'artist' => $this->input->post('artist'),
        'featuring' => $this->input->post('featuring'),
        'album' => $this->input->post('album'),
        'origin' => $orig,
        'translate' => $trans,
        'translator' => $this->input->post('translator'),
        'comment' => $this->input->post('comment'),
        'time' => $timenow,
        'user_id' => $this->session->userdata['user_id']
      );

      $this->db->insert('posts', $data);
      $id = $this->db->insert_id();
      $this->set_lang_by_id($id, json_encode($language));
      $this->set_roman_by_id($id, json_encode($romanize));
      $this->set_category_by_id($id, $this->input->post('category'));
      return $id;
    }
  public function get_post($per_page=20,$offset=0,$user_id=-1){	

    $this->db->order_by("id", "desc");
    if($user_id !== -1){$this->db->where('user_id', $user_id);}
  	$query = $this->db->get('posts',$per_page,$offset);
  	return $query->result();
  }
  public function get_by_id($id)
  {
    $query = $this->db->get_where('posts', array('id' => $id));
    if($this->db->affected_rows()>0){
      return $query->row();
    }else{
      return false;
    }
  }
  public function getlyricjson($post_id, $post_cat)
  {
    $this->db->order_by("id", "desc");
    $query = $this->db->get('posts',1,$post_id);
    if($this->db->affected_rows()<0) return false;
    if ($post_cat == 1){
      return $query->row()->lyric;
    }else{
      if ($query->row()->origin != ""){
        return $query->row()->origin;
      }elseif ($query->row()->translate) {
        return $query->row()->translate;
      }else{
        return $query->row()->lyric;
      }
    }
  }
  public function get_meta_json($post_id)
  {
    $this->db->order_by("id", "desc");
    $query = $this->db->get('posts',1,$post_id);
    if($this->db->affected_rows()<0) return false;
    $post = $query->row();
    $meta_str = $post->name ." by ". $post->artist;
    $meta_str .= strlen($post->featuring) ? " feat. ". $post->featuring : "";
    return $meta_str;
  }
  
	public function get_post_number($user_id=-1){
    if($user_id !== -1){$this->db->where('user_id', $user_id);}
		return $this->db->count_all('posts');
	}
  public function last_post_by_user($id)
  {
    $this->db->order_by("id", "desc"); 
    $query = $this->db->get_where('posts',array('user_id'=>$id));
    if ($query->num_rows()>0){
      return $query->row();
    }else{
      return false;
    }
  }
  public function edit_post($id)
  {
      $timenow = date("Y-m-d H:i:s");
      $language = $this->input->post("lang");
      $language['main'] = $this->input->post("main");
      $language['orig'] = $this->input->post("original");
      $romanize = ["zh"=>"[]", "ja"=>"[]"];
      if (count($language['zh']) > 0){
          $romanize['zh'] = json_decode($this->romanize('zh', $language['zh']));
      }
      if (count($language['ja']) > 0){
          $romanize['ja'] = json_decode($this->romanize('ja', $language['ja']));
      }
      $main = $language[$language['main']];
      $orig = "";
      if ($language['main'] != $language['orig']){
          $orig = $language[$language['orig']];
      }
      $trans = "";
      foreach (["ja", "zh", "en"] as $lcode){
          if ($lcode != $language['orig'] && $lcode != $language['main']){
              $trans .= $language[$lcode];
          }
      }
      $data = array(
          'lyric' => $main,
          'name' => $this->input->post('name'),
          'artist' => $this->input->post('artist'),
          'featuring' => $this->input->post('featuring'),
          'album' => $this->input->post('album'),
          'origin' => $orig,
          'translate' => $trans,
          'translator' => $this->input->post('translator'),
          'comment' => $this->input->post('comment'),
          'time' => $timenow,
          'user_id' => $this->session->userdata['user_id']
      );

      $this->set_lang_by_id($id, json_encode($language));
      $this->set_roman_by_id($id, json_encode($romanize));
      $this->set_category_by_id($id, $this->input->post('category'));

    $this->db->where('id', $id);
    
    $this->db->update('posts', $data);
    return 0;
  }
  public function delete_post($id)
  {
    $this->db->where('id', $id);
    $this->db->delete('posts');
    if($this->db->affected_rows()==0){
      return false;
    }else{
      return TRUE;
    }
  }
  public function search($keyword,$per_page=20,$offset=0)
  {
    //Processing keywords
    $rfrom = array("　", ",", '，');
    $keyword = str_replace($rfrom, ' ', $keyword);
    $keywords = explode(' ', $keyword);
    $count = count($keywords);
    //Generate Query
    $concat = '`comment`,`translator`,`translate`,`origin`,`album`,`featuring`,`artist`,`name`,`lyric`';
    $this->db->like('concat('.$concat.')', $keywords[0]);
    for ($i=1; $i < $count; $i++) { 
      $this->db->like('concat('.$concat.')', $keywords[$i]);
    }
    $query = $this->db->get('posts',$per_page,$offset);
    return $query->result();
  }
  public function post_exist($id){
      return $this->db->get_where('posts', ['id' => $id])->num_rows() > 0;
  }
    public function get_prev_next_id($id) {
        $id = intval($id);
        $this->db->where('id <', $id);
        $this->db->select_max('id');
        $prev = $this->db->get('posts');
        $prev = $prev->num_rows() > 0 ? $prev->row()->id : NULL;
        $this->db->where('id >', $id);
        $this->db->select_min('id');
        $next = $this->db->get('posts');
        $next = $next->num_rows() > 0 ? $next->row()->id : NULL;
        return [$prev, $next];
    }
    public function get_category_by_id($id) {
        $cat = $this->db->get_where('postmeta', ["post_id" => $id, "key" => "category"]);
        if ($cat->num_rows() > 0) {
            return json_decode($cat->row()->value);
        }
        return array();
    }

    public function set_category_by_id($id, $cats) {
        $cate_exist = $this->db->get_where('postmeta', ["post_id" => $id, "key" => "category"])->num_rows() > 0;
        $this->db->set('post_id', $id);
        $this->db->set('key', 'category');
        $this->db->set('value', json_encode($cats));
        if ($cate_exist) {
            $this->db->where(["post_id" => $id, "key" => "category"]);
            $this->db->update('postmeta');
        } else {
            $this->db->insert("postmeta");
        }
    }

    public function get_last_date(){
        $this->db->order_by("time", 'desc');
        $post = $this->db->get('posts', 1)->row();
        return $post->time;
    }

    public function get_lang_by_id($id){
        $q = $this->db->get_where('postmeta', ['post_id' => $id, 'key' => 'languages']);
        if ($q->num_rows() > 0) {
            return $q->row()->value;
        }
        return null;
    }
    
    public function get_lang($timestamp = false){
        if ($timestamp > 0){
            $this->db->join("posts", "posts.id = postmeta.post_id");
            $this->db->where("posts.time >", date("Y-m-d H:i:s", $timestamp));
        }
        $q = $this->db->get_where('postmeta', ['key' => 'languages']);
        $res = [];
        foreach ($q->result() as $i){
            $res[$i->post_id] = $i->value;
        }
        return $res;
    }

    public function set_lang_by_id($id, $json){
        $cate_exist = $this->db->get_where('postmeta', ["post_id" => $id, "key" => "languages"])->num_rows() > 0;
        $this->db->set('post_id', $id);
        $this->db->set('key', 'languages');
        $this->db->set('value', $json);
        if ($cate_exist) {
            $this->db->where(["post_id" => $id, "key" => "lanugages"]);
            $this->db->update('postmeta');
        } else {
            $this->db->insert("postmeta");
        }
    }

    public function get_roman_by_id($id){
        $q = $this->db->get_where('postmeta', ['post_id' => $id, 'key' => 'romanize']);
        if ($q->num_rows() > 0) {
            return $q->row()->value;
        }
        return null;
    }

    public function get_roman($timestamp = false){
        if ($timestamp > 0){
            $this->db->join("posts", "posts.id = postmeta.post_id");
            $this->db->where("posts.time >", date("Y-m-d H:i:s", $timestamp));
        }
        $q = $this->db->get_where('postmeta', ['key' => 'romanize']);
        $res = [];
        foreach ($q->result() as $i){
            $res[$i->post_id] = $i->value;
        }
        return $res;
    }

    public function set_roman_by_id($id, $json){
        $cate_exist = $this->db->get_where('postmeta', ["post_id" => $id, "key" => "romanize"])->num_rows() > 0;
        $this->db->set('post_id', $id);
        $this->db->set('key', 'romanize');
        $this->db->set('value', $json);
        if ($cate_exist) {
            $this->db->where(["post_id" => $id, "key" => "romanize"]);
            $this->db->update('postmeta');
        } else {
            $this->db->insert("postmeta");
        }
    }

    public function romanize($lang, $str) {;
        $cmd = $this->config->item("python_path") . " tr.py ".escapeshellarg($lang)." ".escapeshellarg($str);
        $res = shell_exec($cmd);
        return json_encode(json_decode($res), JSON_UNESCAPED_UNICODE);
    }
}
