<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Edit - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header single-head">
		<div class="container">
			<h2>Dashboard</h2>
		</div>
	</div>
	<div class="container container-fluid">
		<div class="row-fluid">
			<?php $this->load->view('admin/sidebar');?>
			<div class="span10">
				<h1>Edit <small><?=$post->name?> with ID <?=$post->id?></small></h1>

		<?php if($success){ ?>
		<div class="alert alert-success fade in ">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong>Success!</strong> Edited. <?=anchor('post/'.$post->id, 'View post');?>
		</div>
		<?php } 
			  if(@$_GET['post']==='1' ){ ?>
		<div class="alert alert-success fade in ">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong>Success!</strong> Post has been sent to the database.　<?=anchor('post/'.$post->id, 'View post');?>
		</div>
		<?php } ?>

		<?php if(!validation_errors()=='' OR !$errinfo==''){ ?>
		<div class="alert alert-error fade in ">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong>Error!</strong> <?=$errinfo?> <?=validation_errors('<span>','</span>');?>
		</div>
		<?php } ?>

		<?php echo form_open('admin/edit/'.$post->id,array('class'=>'row-fluid')); ?>
			<div class="span6">
				<p class="lead">Content</p>
				<textarea name="lyric" id="lyric" class="span12 lyric" cols="30" rows="20" placeholder="Lyrics here..."><?=$post->lyric?></textarea>
			</div>
			<div class="span6">
				<label for="name">Song Name</label>
				<input type="text" id="name" name="name"  class="span10" placeholder="Oe lu Eana Hufwe" value="<?=$post->name?>">
				<div class="input-prepend control-group">
					<label for="artist" class="pull-left">by</label>
					<input type="text" id="artist" name="artist" value="<?=$post->artist?>" placeholder="Artist" class="span6" style="-webkit-border-radius: 4px 0 0 4px;
-moz-border-radius: 4px 0 0 4px;
border-radius: 4px 0 0 4px;">
					<span class="add-on" style="-webkit-border-radius: 0;
-moz-border-radius: 0;
border-radius: 0; margin: 0 -1px;">feat.</span>
					<input type="text" id="featuring" name="featuring" value="<?=$post->featuring?>" class="span4" placeholder="(optional)">
				</div>
				<div class="control-group">
					<label for="album" class="pull-left">in</label>
					<input type="text" placeholder="Album (Optional)" value="<?=$post->album?>" class="span11" id="album" name="album">
				</div>
				<div class="control-group">
					<label class="pull-left" for="origin">Original Lyric</label>
					<textarea rows="1" type="text" placeholder="(optional)" id="origin" name="origin" class="span11"><?=$post->origin?></textarea>
				</div>
				<div class="control-group">
					<label class="pull-left" for="translate">Translate lyric</label>
					<textarea rows="1" type="text" placeholder="(optional)" id="translate" name="translate" class="span11"><?=$post->translate?></textarea>
				</div>
				<div class="control-group">
					<label class="pull-left" for="translator">Translator</label>
					<input type="text" placeholder="(optional)" id="translator" value="<?=$post->translator?>" name="translator" class="span11">
				</div>
				<label for="comment">Comment</label>
				<textarea name="comment" id="comment" name="comment" cols="30" rows="4" class="span11" placeholder="(optional)"><?=$post->comment?></textarea>
				<div>
				<input type="submit" name="submit" value="Edit" class="btn btn-primary">
				<input type="button" value="Draft" class="btn disabled">	
				</div>
				
			</div>

		</Form>
			</div>
			
		</div>

	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>