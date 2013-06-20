<?php 
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
  public function get_post($per_page=20,$offset=0){	
    $this->db->order_by("id", "desc");
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
	public function get_post_number(){
		return $this->db->count_all('posts');
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
    'comment' => $this->input->post('comment')
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
}
?>