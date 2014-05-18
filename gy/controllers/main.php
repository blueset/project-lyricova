<?php 

class main extends CI_Controller {
	public function __construct()
  {
    parent::__construct();
    $this->load->model('post_model');
    $this->load->model('user_model');
    $this->load->model('admin_model');
    $this->load->helper('url');
  }
	public function index($page=1){
		$this->load->library('pagination');
		$this->load->helper('string');
		$this->load->library('typography');
    $this->load->model('admin_model');

		$config['base_url'] = site_url('/page/');
		$config['total_rows'] = $this->post_model->get_post_number();
		$config['per_page'] = 20; 
		$config['uri_segment'] = 2; 
		$this->pagination->initialize($config); 
		$pageNum=$this->uri->segment(2)?$this->uri->segment(2):1;
	    if($pageNum==1){
   			$offset=0;
  		}else{
   			$offset=$config['per_page']*($pageNum-1);
  		}
		$data['posts'] = $this->post_model->get_post($config['per_page'],$offset);
		$this->load->view('gy/index',$data);
	}
  public function rss(){
    header ('Content-Type: text/xml');
    $this->load->helper('string');
    $this->load->helper('date');
    $this->load->library('typography');
    $this->load->model('admin_model');
    $data['posts'] = $this->post_model->get_post(20,0);
    $this->load->view('gy/rss',$data);
  }
	
  public function page()
  {
    redirect('/');
  }
  public function single($id)
  {
    $this->load->helper('string');
    $this->load->library('typography');
    $data['post']=$this->post_model->get_by_id($id);
    if($data['post']===FALSE){$this->load->view('gy/404');}
    else{
      $this->load->view('gy/single',$data);
    }
  }
  public function p404()
  {
    $this->load->view('gy/404');
  }
	
	public function delete($id)
	{

		//Init vars
  	$data['success']=FALSE;
		$data['errinfo']='';
 		$data['post']=$this->post_model->get_by_id($id);
 		//Check Allowance
    $own = $this->user_model->is_own($postitem->user_id);
 		$allow = $this->user_model->access_to("delete".$own); //allow to post?
 		//Store Err info
    if (! ($allow === TRUE)){
 			redirect('error/1');
      die;
 		}
    //If post not exist
    if($data['post']===FALSE){$this->load->view('gy/404');}
 		//Display
 		elseif (!($allow===TRUE)){
		 $this->load->view('gy/delete',$data);
	  }
 		else
 		{
 			$data['post']=$this->post_model->get_by_id($id);
 			if ($this->post_model->delete_post($id)){
   			$data['success'] = TRUE;
   			$this->load->view('gy/delete',$data);
   		}else{
   			$data['errinfo']='Delete failed';
   			$this->load->view('gy/delete',$data);
   		}
 		}
	}
  public function search()
  {
    //call on libraries
    $this->load->helper('string');
    $this->load->library('typography');
    //Call on search func.
    $keyword = $this->input->get('q',TRUE);
    $data['posts'] = $this->post_model->search($keyword,20,0);
    $data['keyword'] = $keyword;
    $data['count'] = count($data['posts']);
    $this->load->view('gy/search',$data);
  }
  public function getpostxml($id)
  {
    $post = $this->post_model->get_by_id($id);
    $string = <<<XML
<?xml version='1.0' encoding='utf-8'?>
<post>
XML;

    if (!($post === FALSE)){
      $string .= "\n".'<lyric>'.$post->lyric.'</lyric>';
      $meta = $post->name." by ".$post->artist;
      $meta .= (strlen($post->featuring)) ? " feat. ".$post->featuring : "";
      $meta .= (strlen($post->album)) ? " in ".$post->album : "";
      $string .= "\n".'<metainfo>'.$meta.'</metainfo>';
    }
    else{
      $string .= "\n".'<lyric>Error! Post not found.</lyric>';
      $string .= "\n".'<metainfo>Error! Post not found.</metainfo>';
    }
    $string .= "\n".'</post>';
    echo $string; 
  }
  public function error($id=0)
  {
    $err_message = array('Undefined error occured.', //0
                         'You do not have the right to access this page.' //1
                        );
    if ($id>=count($err_message)){$id=0;}
    $data['errmsg'] = $err_message[$id];
    $this->load->view('gy/error',$data);
  }
  public function postcountjson()
  {
    $callbackstr= isset($_GET['callback']) ? $_GET['callback'] : "callback";
    $number = $this->post_model->get_post_number();
    echo $callbackstr."(".$number.");";
  }
  public function getlyricjson()
  {
    $post_id = isset($_GET['post_id']) ? intval($_GET['post_id']) : -1;
    $post_cat = isset($_GET['post_cat']) ? intval($_GET['post_cat']) : 1;
    $callbackstr= isset($_GET['callback']) ? $_GET['callback'] : "callback";
    $lyricString = $this->post_model->getlyricjson($post_id,$post_cat);
    if($lyricString != FALSE){
      $lyricString = strip_tags($lyricString);
      $lyricString = str_replace("　", "\n", $lyricString);
      $lyricarray = explode("\n", $lyricString);
      echo $callbackstr."(";
      echo json_encode($lyricarray);
      echo ");";
    }else{
      echo $callbackstr.'(["深刻なエラーが発生しました"]);';
    }
  }
  public function getlyricmetajson()
  {
    $post_id = isset($_GET['post_id']) ? intval($_GET['post_id']) : -1;
    $callbackstr= isset($_GET['callback']) ? $_GET['callback'] : "callback";
    $meta_str=$this->post_model->get_meta_json($post_id);
    if($meta_str != FALSE){
      echo $callbackstr."('";
      echo $meta_str;
      echo "');";
    }else{
      echo $callbackstr.'(["深刻なエラーが発生しました"]);';
    }
  }
          
}
