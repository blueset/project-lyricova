<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title><?=$post->name?> - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header single-head">
		<div class="container">
			<h2><?=lang('main_single_post');?></h2>
		</div>
	</div>
	<?php $own = $this->user_model->is_own($post->user_id); ?>
	<div class="container single-cont">
		<div class="row">
			<div class="span9">
				<div class="song-box">
					<div class="songb-single-cont">
						<p><?=$this->typography->nl2br_except_pre($post->lyric)?></p>
						<p class="small"><span class="title"><?=$post->name?></span> <wbr><?=lang('main_artist_label');?> <span class="author"><?=$post->artist?></span> <?php if(!$post->featuring=="") {?><wbr><?=lang('main_feat');?> <span class="feat"><?=$post->featuring?></span> <?php } ?><?php if(!$post->album==""){ ?><wbr><?=lang('main_artist_label');?> <span class="album"><?=$post->album?></span> <?php } ?></p>
					</div>
				</div>
			</div>
			<div class="span3">
				<dl>
					<dt>Posted at</dt><dd><?=$post->time?></dd> 
					<dt>by</dt> <dd><?=$this->user_model->get_by_id($post->user_id)->display_name?></dd>
					<?php if(!$post->origin==""){ echo '<dt>'.lang('main_original_lyric').':</dt><dd> '.$this->typography->nl2br_except_pre($post->origin).'</dd>';} ?>
  					<?php if(!$post->translate==""){ echo '<dt>'.lang('main_translated_lyric').':</dt><dd> '.$this->typography->nl2br_except_pre($post->translate).'</dd>';} ?>
  					<?php if(!$post->translator==""){ echo '<dt>'.lang('main_translator').':</dt><dd> '.$post->translator.'</dd>';} ?>
  					<?php if(!$post->comment==""){ echo '<dt>'.lang('main_comment').':</dt><dd> '.$this->typography->nl2br_except_pre($post->comment).'</dd>';} ?>
  					<p style="padding-top:10px;">
  						<?php if($this->user_model->access_to("edit".$own)===TRUE){ echo anchor('admin/edit/'.$post->id, lang('main_edit'), 'class="btn btn-mini btn-primary"'); }?> 
        				<?php if($this->user_model->access_to("delete".$own)===TRUE){ echo '<a href="javascript:void(0)" class="btn btn-mini" onclick="delConfModalSingle()">'.lang('main_delete').'</a>'; }?>
        			
        			
						<?=anchor('imggen/new/'.$post->id, lang('main_generat_image'), 'class="btn btn-mini"')?>
					</p>
        		</dl>	
			</div>
			<div class="span12">
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
			<h3><?=lang('main_confirm_delete');?></h3>
		</div>
		<div class="modal-body">
			<p><?=lang('main_confirm_delete_cont');?></p>
			<p id="del_info">ID: <?=$post->id?></p>
			<p id="del_info"><?=lang('main_content');?>: <br><?=$this->typography->nl2br_except_pre($post->lyric)?></p>
		</div>
		<div class="modal-footer">
			<?=anchor('delete/'.$post->id, lang('main_delete'), 'class="btn btn-danger"');?>
			<a href="#" data-dismiss="modal" class="btn btn-primary"><?=lang('main_cancel');?></a>
		</div>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>