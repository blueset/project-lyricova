<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Delete - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="jumbotron header single-head">
		<div class="container">
			<h2>
				Delete
				<?php if($errinfo==''){ ?><small> item <?=$post->name?> with ID <?=$post->id?></small><?php }else{ echo '<p class="lead">A critical error has occured. -- the Disappearance<p>';}?>
			</h2>	
			<p class="lead"></p>
		</div>
	</div>
	<div class="container">
		<?php if($success ){ ?>
		<div class="alert alert-success fade in alert-dismissable">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong>Success!</strong> Item Deleted.
		</div>
		<div class="alert fade in alert-warning">
  			<strong>Attention!</strong> Please keep this page if you want to recover your deleted item. Data would be irrecoverable after you close it. 
		</div>
		<table class="table">
			<tbody>
				<tr><th>Column</th><th>Info</th></tr>
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
			</tbody>
		</table>
		<?php } ?>

		<?php if(!$errinfo==''){ ?>
		<div class="alert alert-error fade in ">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong>Error!</strong> <?=$errinfo?> 
		</div>
		<?php } ?>

		


	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>