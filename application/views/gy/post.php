<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Post - Project Gy - 歌语计划</title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header">
		<div class="container">
			<h1>Post a new item.</h1>	
		</div>
	</div>
	<div class="container">
		<?php if($success ){ ?>
		<div class="alert alert-success fade in ">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong>Success!</strong> Post has been sent to the database.
		</div>
		<?php } ?>

		<?php if(!validation_errors()=='' OR !$errinfo==''){ ?>
		<div class="alert alert-error fade in ">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong>Error!</strong> <?=$errinfo?> <?=validation_errors('<span>','</span>');?>
		</div>
		<?php } ?>

		<?php echo form_open('post',array('class'=>'row')); ?>
			<div class="span6">
				<p class="lead">Content</p>
				<textarea name="lyric" id="lyric" class="span6 lyric" cols="30" rows="10" placeholder="Lyrics here..."></textarea>
			</div>
			<div class="span6">
				<label for="name">Song Name</label>
				<input type="text" id="name" name="name"  class="span5" placeholder="Oe lu Eana Hufwe">
				<div class="input-prepend control-group">
					<label for="artist" class="pull-left">by</label>
					<input type="text" id="artist" name="artist" placeholder="Artist" class="span3" style="-webkit-border-radius: 4px 0 0 4px;
-moz-border-radius: 4px 0 0 4px;
border-radius: 4px 0 0 4px;">
					<span class="add-on" style="-webkit-border-radius: 0;
-moz-border-radius: 0;
border-radius: 0; margin: 0 -1px;">feat.</span>
					<input type="text" id="featuring" name="featuring" class="span2" placeholder="(optional)">
				</div>
				<div class="control-group">
					<label for="album" class="pull-left">in</label>
					<input type="text" placeholder="Album (Optional)" class="span4" id="album" name="album">
				</div>
				<div class="control-group">
					<label class="pull-left" for="origin">Original Lyric</label>
					<textarea rows="1" type="text" placeholder="(optional)" id="origin" name="origin" class="span4"></textarea>
				</div>
				<div class="control-group">
					<label class="pull-left" for="translate">Translate lyric</label>
					<textarea rows="1" type="text" placeholder="(optional)" id="translate" name="translate" class="span4"></textarea>
				</div>
				<div class="control-group">
					<label class="pull-left" for="translator">Translator</label>
					<input type="text" placeholder="(optional)" id="translator" name="translator" class="span4">
				</div>
				<label for="comment">Comment</label>
				<textarea name="comment" id="comment" name="comment" cols="30" rows="4" class="span5" placeholder="(optional)"></textarea>
				<div>
				<input type="submit" name="submit" value="Submit" class="btn btn-primary">
				<input type="button" value="Draft" class="btn disabled">	
				</div>
				
			</div>

		</Form>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>