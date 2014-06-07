<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title><?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<script>var current_page='index';</script>
	<?php $this->load->view('gy/header');?>
	<div class="header jumbotron">
		<div class="container">
			<h1><?=$this->admin_model->get_config('banner');?></h1>
			<p class="lead"><?=$this->admin_model->get_config('subbanner');?></p>			
		</div>
	</div>
	<div class="container">
		<div class="row songbox-row">

			<?php foreach ($posts as $postitem): ?>
			<?php
			$lyricinline=strip_quotes($this->typography->nl2br_except_pre($postitem->lyric));
			$own = $this->user_model->is_own($postitem->user_id);
			?>
			<div class="songbox-cont col-sm-6 col-md-4 col-xs-12" >
				<div class="song-box">
				<div class="lyric"><?=$this->typography->nl2br_except_pre($postitem->lyric)?></div>
				<div class="meta text-muted">
				<div class="infobuttons">
					<?=anchor('/post/'.$postitem->id, '<i class="fa fa-arrow-circle-right fa-large"></i>');?> 
					<a data-toggle="collapse" class="infobutton" data-target="#detail-<?=$postitem->id?>" href="javascript:void(0)"> <i class="fa fa-chevron-circle-down fa-large"></i> </a>
				</div>
				<small>
					
					<span class="title" onclick="window.open('<?= site_url('/post/'.$postitem->id)?>')"><?=$postitem->name?></span> by <span class="author"><?=$postitem->artist?></span> <?php if(!$postitem->featuring=="") {?>feat. <span class="feat"><?=$postitem->featuring?></span> <?php } ?><?php if(!$postitem->album==""){ ?>in <span class="album"><?=$postitem->album?></span> <?php } ?> 
					 
				</small></div>
  				<div id="detail-<?=$postitem->id?>" class="collapse">
  					<?php if(!$postitem->origin==""){ echo '<strong>Original Lyric:</strong> <br>'.$this->typography->nl2br_except_pre($postitem->origin).'<br>';} ?>
  					<?php if(!$postitem->translate==""){ echo '<strong>Translated Lyric:</strong> <br>'.$this->typography->nl2br_except_pre($postitem->translate).'<br>';} ?>
  					<?php if(!$postitem->translator==""){ echo '<strong>Translator:</strong> '.$postitem->translator.'<br>';} ?>
  					<?php if(!$postitem->comment==""){ echo '<strong>Comment:</strong><br>'.$this->typography->nl2br_except_pre($postitem->comment).'<br>';} ?>
        			<small class="muted">
        				Posted at <time><?=$postitem->time?></time> by <?=$this->user_model->get_by_id($postitem->user_id)->display_name?>. 
        				<?php if($this->user_model->access_to("edit".$own)===TRUE){ echo " | ".anchor('admin/edit/'.$postitem->id, 'Edit'); }?> 
        				<?php if($this->user_model->access_to("delete".$own)===TRUE){ echo " | ".'<a href="javascript:void(0)" onclick="delConfModal('.$postitem->id.",'".jsize_string(strip_quotes($postitem->lyric))."')\">Delete</a>"; }?>
        			</small>
    			</div>
    			</div>
			</div>
			<?php endforeach ?>
			<div class="songbox-cont col-sm-12" >
				<?=$this->pagination->create_links();?>
			</div>
		</div>
	</div>
	<div class="modal fade" id="Del">
  		<div class="modal-dialog">
    		<div class="modal-content">
      			<div class="modal-header">
        			<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
        			<h4 class="modal-title">Confirm Delete</h4>
      			</div>
      		<div class="modal-body">
        		<p>Are you sure you want to delete the following item?</p>
				<p id="del_info">....</p>
      		</div>
      		<div class="modal-footer">
        		<a href="#" class="btn btn-default" data-dismiss="modal">Cancel</a>
        		<a href="#" class="btn btn-danger" id="btn-delete">Delete</a>
      		</div>
    		</div><!-- /.modal-content -->
  		</div><!-- /.modal-dialog -->
	</div><!-- /.modal -->
	<?php $this->load->view('gy/footer');?>
</body>
</html>