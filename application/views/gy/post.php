<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title><?=lang('main_post');?> - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header">
		<div class="container">
			<h1><?=lang('main_post_header');?></h1>	
		</div>
	</div>
	<div class="container">
		

		<?php 
		if(!validation_errors()=='' OR !$errinfo==''){ ?>
		<div class="alert alert-error fade in ">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong><?=lang('main_error');?></strong> <?=$errinfo?> <?=validation_errors('<span>','</span>');?>
		</div>
		<?php } ?>

		<?php echo form_open('post',array('class'=>'row')); ?>
			<div class="span6">
				<p class="lead"><?=lang('main_content');?></p>
				<textarea name="lyric" id="lyric" class="span6 lyric" cols="30" rows="10" placeholder="<?=lang('main_post_lyric_ph');?>" ><?php echo set_value('lyric'); ?></textarea>
			</div>
			<div class="span6">
				<label for="name"><?=lang('main_song_name');?></label>
				<input type="text" id="name" name="name" value="<?php echo set_value('name'); ?>" class="span5" placeholder="Oe lu Eana Hufwe">
				<div class="input-prepend control-group">
					<label for="artist" class="pull-left"><?=lang('main_artist_label');?></label>
					<input type="text" id="artist" name="artist" placeholder="<?=lang('main_artist');?>" value="<?php echo set_value('artist'); ?>" class="span3" style="-webkit-border-radius: 4px 0 0 4px;
-moz-border-radius: 4px 0 0 4px;
border-radius: 4px 0 0 4px;">
					<span class="add-on" style="-webkit-border-radius: 0;
-moz-border-radius: 0;
border-radius: 0; margin: 0 -1px;"><?=lang('main_feat');?></span>
					<input type="text" id="featuring" name="featuring" value="<?php echo set_value('featuring'); ?>" class="span2" placeholder="<?=lang('main_optional');?>">
				</div>
				<div class="control-group">
					<label for="album" class="pull-left"><?=lang('main_album_label');?></label>
					<input type="text" placeholder="<?=lang('main_album');?> <?=lang('main_optional');?>" class="span4" id="album" value="<?php echo set_value('album'); ?>" name="album">
				</div>
				<div class="control-group">
					<label class="pull-left" for="origin"><?=lang('main_original_lyric');?></label>
					<textarea rows="1" type="text" placeholder="<?=lang('main_optional');?>" id="origin" name="origin" class="span4"><?php echo set_value('origin'); ?></textarea>
				</div>
				<div class="control-group">
					<label class="pull-left" for="translate"><?=lang('main_translated_lyric');?></label>
					<textarea rows="1" type="text" placeholder="<?=lang('main_optional');?>" id="translate" name="translate" class="span4"><?php echo set_value('translate'); ?></textarea>
				</div>
				<div class="control-group">
					<label class="pull-left" for="translator"><?=lang('main_translator');?></label>
					<input type="text" placeholder="<?=lang('main_optional');?>" id="translator" name="translator" value="<?php echo set_value('translator'); ?>" class="span4">
				</div>
				<label for="comment"><?=lang('main_comment');?></label>
				<textarea name="comment" id="comment" name="comment" cols="30" rows="4" class="span5" placeholder="<?=lang('main_optional');?>"><?php echo set_value('comment'); ?></textarea>
				<div>
				<input type="submit" name="submit" value="<?=lang('main_submit');?>" class="btn btn-primary">
				<input type="button" value="<?=lang('main_draft');?>" class="btn disabled">	
				</div>
				
			</div>

		</Form>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>