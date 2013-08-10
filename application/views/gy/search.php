<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title><?=lang('main_search_result');?> - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header">
		<div class="container">
			<h1><?=lang('main_search_result');?></h1>
			<p class="lead"><?=lang('main_searching');?> “<?=$keyword?>” <?=lang('main_search_with');?> <?=$count?> <?php if($count > 1){echo lang('main_results');}else{echo lang('main_result');} ?>.</p>			
		</div>
	</div>
	<div class="container">
		<?php if($count > 20): ?>
			<div class="alert alert-info">
				<?=lang('main_search_only_20');?>
			</div>
		<?php endif; ?>
		<?php if($count < 1): ?>
			<div class="alert alert-error clear-fix">
				<?=lang('main_search_no_result');?>
			</div>
		<?php endif; ?>
		<div class="row songbox-row">
			<?php foreach ($posts as $postitem): ?>
			<?php $lyricinline=strip_quotes($this->typography->nl2br_except_pre($postitem->lyric));?>
			<div class="songbox-cont span4" >
				<div class="song-box">
				<div class="lyric"><?=$this->typography->nl2br_except_pre($postitem->lyric)?></div>
				<div class="meta muted"><small>
					<span class="title" onclick="window.open('<?= site_url('/post/'.$postitem->id)?>')"><?=$postitem->name?></span> <?=lang('main_artist_label');?> <span class="author"><?=$postitem->artist?></span> <?php if(!$postitem->featuring=="") {?><?=lang('main_feat');?> <span class="feat"><?=$postitem->featuring?></span> <?php } ?><?php if(!$postitem->album==""){ ?><?=lang('main_album_label');?> <span class="album"><?=$postitem->album?></span> <?php } ?><a data-toggle="collapse" data-target="#detail-<?=$postitem->id?>" href="javascript:void(0)"><?=lang('main_more');?></a>
				</small></div>
  				<div id="detail-<?=$postitem->id?>" class="collapse">
  					<?php if(!$postitem->origin==""){ echo '<strong>'.lang('main_original_lyric').':</strong> <br>'.$this->typography->nl2br_except_pre($postitem->origin).'<br>';} ?>
  					<?php if(!$postitem->translate==""){ echo '<strong>'.lang('main_translated_lyric').':</strong> <br>'.$this->typography->nl2br_except_pre($postitem->translate).'<br>';} ?>
  					<?php if(!$postitem->translator==""){ echo '<strong>'.lang('main_translator').':</strong> '.$postitem->translator.'<br>';} ?>
  					<?php if(!$postitem->comment==""){ echo '<strong>'.lang('main_comment').':</strong><br>'.$this->typography->nl2br_except_pre($postitem->comment).'<br>';} ?>
        			<small class="muted">
        				Posted at <time><?=$postitem->time?></time> by <?=$this->user_model->get_by_id($postitem->user_id)->display_name?>. 
        				<?php if($this->user_model->access_to("edit".$own)===TRUE){ echo anchor('admin/edit/'.$postitem->id, lang('main_edit')); }?> 
        				<?php if($this->user_model->access_to("delete".$own)===TRUE){ echo '<a href="javascript:void(0)" onclick="delConfModal('.$postitem->id.",'".jsize_string(strip_quotes($postitem->lyric))."')\">".lang('main_delete')."</a>"; }?>
        			</small>
    			</div>
    			</div>
			</div>
			<?php endforeach ?>
			<?php //$this->pagination->create_links(); ?>
		</div>
	</div>
	<div class="modal hide" id="Del">
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal">×</button>
			<h3><?=lang('main_confirm_delete');?></h3>
		</div>
		<div class="modal-body">
			<p><?=lang('main_confirm_delete_cont');?></p>
			<p id="del_info">....</p>
		</div>
		<div class="modal-footer">
			<a href="#" class="btn btn-danger" id="btn-delete"><?=lang('main_delete');?></a>
			<a href="#" data-dismiss="modal" class="btn btn-primary"><?=lang('main_cancel');?></a>
		</div>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>