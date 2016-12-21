<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');
class post_model extends CI_Model {

  public function __construct(){
    parent::__construct();
    $this->load->database();
  }
  public function post_item(){
  $this->load->helper('url');
  $this->load->helper('date');
  $timenow = mdate('%Y-%m-%d %H:%i:%s',now());
  $data = array(
    'lyric' => $this->input->post('lyric'),
    'name' => $this->input->post('name'),
    'artist' => $this->input->post('artist'),
    'featuring' => $this->input->post('featuring'),
    'album' => $this->input->post('album'),
    'origin' => $this->input->post('origin'),
    'translate' => $this->input->post('translate'),
    'translator' => $this->input->post('translator'),
    'comment' => $this->input->post('comment'),
    'time' => $timenow,
    'user_id' => $this->session->userdata['user_id']
  );
  
  $this->db->insert('posts', $data);
  return $this->db->insert_id();
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
    $data = array(
    'lyric' => $this->input->post('lyric'),
    'name' => $this->input->post('name'),
    'artist' => $this->input->post('artist'),
    'featuring' => $this->input->post('featuring'),
    'album' => $this->input->post('album'),
    'origin' => $this->input->post('origin'),
    'translate' => $this->input->post('translate'),
    'translator' => $this->input->post('translator'),
    'comment' => $this->input->post('comment'),
    'time' => mdate('%Y-%m-%d %H:%i:%s',now())
    );
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
}
