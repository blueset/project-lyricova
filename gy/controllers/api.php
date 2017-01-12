<?php

/**
 * Created by PhpStorm.
 * User: blueset
 * Date: 1/1/17
 * Time: 21:28
 */
class API extends CI_Controller {
    public function __construct()
    {
        parent::__construct();
        $this->load->model('post_model');
        $this->load->helper('url');
        $this->output->set_header("Access-Control-Allow-Origin: *");
        $this->output->set_header("Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS");
        $this->output->set_header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    }

    public function last_update(){
        $this->output->set_header("Content-type: application/json");
        $d = new DateTime($this->post_model->get_last_date());
        $this->output->set_output($d->getTimestamp());
    }

    public function get_data(){
        $timestamp = $this->input->get('timestamp');
        if($timestamp != false){
            $timestamp = intval($timestamp);
        }

        $lang = $this->post_model->get_lang($timestamp);
        $roman = $this->post_model->get_roman($timestamp);
        $res = [];
        foreach($lang as $id => $langval){
            $post = $this->post_model->get_by_id($id);
            $meta_str = $post->name ." by ". $post->artist;
            $meta_str .= strlen($post->featuring) ? " feat. ". $post->featuring : "";
            $res[$id] = ["languages" => json_decode($langval),
                "romanize" => json_decode($roman[$id]),
                "title" => $meta_str,
                "category" => $this->post_model->get_category_by_id($id)];
        }
        $this->output->set_header("Content-type: application/json");
        $this->output->set_output(json_encode($res, JSON_UNESCAPED_UNICODE));
    }

}