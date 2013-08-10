<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title><?=lang('main_delete');?> - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header single-head">
		<div class="container">
			<h2>
				<?=lang('main_delete');?>
				<?php if($errinfo==''){ ?><small> <?=lang('main_item');?> <?=$post->name?> <?=lang('main_with_id');?> <?=$post->id?></small><?php }else{ echo '<p class="lead">'.lang('main_delete_404').'<p>';}?>
			</h2>	
			<p class="lead"></p>
		</div>
	</div>
	<div class="container">
		<?php if($success ){ ?>
		<div class="alert alert-success fade in ">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong><?=lang('main_success');?></strong> <?=lang('main_delete_ok');?>
		</div>
		<div class="alert fade in ">
  			<strong><?=lang('main_attention');?></strong> <?=lang('main_delete_attention');?> 
		</div>
		<table class="table">
			<tr><th><?=lang('main_column');?></th><th><?=lang('main_info');?></th></tr>
			<tr><td>lyric</td><td><?=$post->lyric?></td></tr>
    		<tr><td>name</td><td><?=$post->name?></td></tr>
    		<tr><td>artist</td><td><?=$post->artist?></td></tr>
    		<tr><td>featuring</td><td><?=$post->featuring?></td></tr>
    		<tr><td>album</td><td><?=$post->album?></td></tr>
    		<tr><td>origin</td><td><?=$post->origin?></td></tr>
    		<tr><td>translate</td><td><?=$post->translate?></td></tr>
    		<tr><td>translator</td><td><?=$post->translator?></td></tr>
    		<tr><td>comment</td><td><?=$post->comment?></td></tr>
    		<tr><td>time</td><td><?=$post->time?></td></tr>
    		<tr><td>user_id</td><td><?=$post->user_id?></td></tr>
		</table>
		<?php } ?>

		<?php if(!$errinfo==''){ ?>
		<div class="alert alert-error fade in ">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong><?=lang('main_error');?></strong> <?=$errinfo?> 
		</div>
		<?php } ?>

		


	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>