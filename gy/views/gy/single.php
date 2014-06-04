<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title><?=$post->name?> - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="jumbotron header single-head">
		<div class="container">
			<h2>Post</h2>
		</div>
	</div>
	<?php $own = $this->user_model->is_own($post->user_id); ?>
	<div class="container single-cont">
		<div class="row">
			<div class="col-sm-9 col-md-9">
				<div class="song-box">
					<div class="songb-single-cont">
						<p><?=$this->typography->nl2br_except_pre($post->lyric)?></p>
						<p class="small"><span class="title"><?=$post->name?></span> <wbr>by <span class="author"><?=$post->artist?></span> <?php if(!$post->featuring=="") {?><wbr>feat. <span class="feat"><?=$post->featuring?></span> <?php } ?><?php if(!$post->album==""){ ?><wbr>in <span class="album"><?=$post->album?></span> <?php } ?></p>
					</div>
				</div>
			</div>
			<div class="col-sm-3 col-md-3">
				<dl>
					<dt>Posted at</dt><dd><?=$post->time?></dd> 
					<dt>by</dt> <dd><?=$this->user_model->get_by_id($post->user_id)->display_name?></dd>
					<?php if(!$post->origin==""){ echo '<dt>Original Lyric:</dt><dd> '.$this->typography->nl2br_except_pre($post->origin).'</dd>';} ?>
				
					
  					<?php if(!$post->translate==""){ echo '<dt>Translated Lyric:</dt><dd> '.$this->typography->nl2br_except_pre($post->translate).'</dd>';} ?>
  					<?php if(!$post->translator==""){ echo '<dt>Translator:</dt><dd> '.$post->translator.'</dd>';} ?>
  					<?php if(!$post->comment==""){ echo '<dt>Comment:</dt><dd> '.$this->typography->nl2br_except_pre($post->comment).'</dd>';} ?>
  					<p style="padding-top:10px;">
  						<?php if($this->user_model->access_to("edit".$own)===TRUE){ echo anchor('admin/edit/'.$post->id, 'Edit', 'class="btn btn-xs btn-primary"'); }?> 
        				<?php if($this->user_model->access_to("delete".$own)===TRUE){ echo '<a href="javascript:void(0)" class="btn btn-default btn-xs" onclick="delConfModalSingle()">Delete</a>'; }?>
        			
        			
						<?=anchor('imggen/new/'.$post->id, 'Generate Image', 'class="btn btn-xs"')?>
					</p>
        		</dl>	
			</div>
			<div class="col-sm-12 col-md-12">
				<?php 
					$data['comment_id']='post_'.$post->id;
					$this->load->view('gy/comment',$data);
				?>
			</div>

		</div>
	</div>
	<div class="modal hide" id="Del">
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal">×</button>
			<h3>Confirm Delete</h3>
		</div>
		<div class="modal-body">
			<p>Are you sure you want to delete the following item?</p>
			<p id="del_info">ID: <?=$post->id?></p>
			<p id="del_info">Lyric: <br><?=$this->typography->nl2br_except_pre($post->lyric)?></p>
		</div>
		<div class="modal-footer">
			<?=anchor('delete/'.$post->id, 'Delete', 'class="btn btn-danger"');?>
			<a href="#" data-dismiss="modal" class="btn btn-primary">Cancel</a>
		</div>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>