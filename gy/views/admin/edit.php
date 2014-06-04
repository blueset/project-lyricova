<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Edit - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<div id="wrapper">
		<?php $this->load->view('admin/header');?>
		<div class="jumbotron header single-head admin-jumbotron">
			<div class="page-wrapper">
				<h2>Edit <small><?=$post->name?> with ID <?=$post->id?></small></h2>
			</div>
		</div>
		<div id="page-wrapper">
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
                <div class="col-sm-6">
                    <p class="lead">Content</p>
                    <textarea name="lyric" id="lyric" class="form-control lyric" cols="30" rows="20" placeholder="Lyrics here..."><?=$post->lyric?></textarea>
                </div>
                <div class="col-sm-6">
                    <div class="form-group">
                    	<label for="name">Song Name</label>
                    	<input type="text" id="name" name="name" class="form-control" placeholder="Oe lu Eana Hufwe" value="<?=$post->name?>">
                    </div>

                    <div class="form-horizontal">
                    	<div class="input-group form-group" style="margin-bottom:0">
                    	    <label for="artist" class="col-xs-1 control-label">by</label>
                    	    <div class="col-xs-11" style="padding-right: 30px;">
                    	    	<div class="form-group input-group">
                    	    		<input type="text" id="artist" name="artist" value="<?=$post->artist?>" placeholder="Artist" class="form-control" style="-webkit-border-radius: 4px 0 0 4px;
                    	    		-moz-border-radius: 4px 0 0 4px;
                    	    		border-radius: 4px 0 0 4px;">
                    	    		<span class="input-group-addon" style="-webkit-border-radius: 0;
                    	    		                    	-moz-border-radius: 0;
                    	    		                    	border-radius: 0; margin: 0 -1px;">feat.</span>                    	 
                    	    		<input type="text" id="featuring" name="featuring" value="<?=$post->featuring?>" class="form-control" placeholder="(optional)">
                    	    	</div>
                    	    </div>
                    	    
                    	</div>
                    </div>
                    <div class="form-group">
                        <label for="album" class="pull-left">in</label>
                        <input type="text" class="form-control" placeholder="Album (Optional)" value="<?=$post->album?>" id="album" name="album">
                    </div>
                    <div class="form-group">
                        <label class="pull-left" for="origin">Original Lyric</label>
                        <textarea rows="1" class="form-control" type="text" placeholder="(optional)" id="origin" name="origin"><?=$post->origin?></textarea>
                    </div>
                    <div class="form-group">
                        <label class="pull-left" for="translate">Translate lyric</label>
                        <textarea rows="1" class="form-control" type="text" placeholder="(optional)" id="translate" name="translate"><?=$post->translate?></textarea>
                    </div>
                    <div class="form-group">
                        <label class="pull-left" for="translator">Translator</label>
                        <input type="text" class="form-control" placeholder="(optional)" id="translator" value="<?=$post->translator?>" name="translator">
                    </div>
                    <label for="comment">Comment</label>
                    <textarea name="comment" id="comment" name="comment" cols="30" rows="4" class="form-control" placeholder="(optional)"><?=$post->comment?></textarea>
                    <div>
                    <input type="submit" name="submit" value="Edit" class="btn btn-primary">
                    <input type="button" value="Draft" class="btn disabled">    
                    </div>
                    
                </div>

            </Form>
		</div>
		<?php $this->load->view('gy/footer');?>
	</div>
</body>
</html>