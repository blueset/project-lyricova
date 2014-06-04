<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Post - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<div id="wrapper">
		<?php $this->load->view('admin/header');?>
		<div class="jumbotron header single-head admin-jumbotron">
			<div class="page-wrapper">
				<h2>Post</h2>
			</div>
		</div>
		<div id="page-wrapper">
			<?php if(!validation_errors()=='' OR !$errinfo==''){ ?>
                <div class="alert alert-error fade in ">
                    <a href="#" class="close" data-dismiss="alert">&times;</a>
                    <strong>Error!</strong> <?=$errinfo?> <?=validation_errors('<span>','</span>');?>
                </div>
                <?php } ?>

            <?php echo form_open('admin/post',array('class'=>'row')); ?>
                <div class="col-sm-6">
                    <p class="lead">Content</p>
                    <textarea name="lyric" id="lyric" class="form-control lyric" cols="30" rows="20" placeholder="Lyrics here..."><?php echo set_value('lyric'); ?></textarea>
                </div>
                <div class="col-sm-6">
                    <div class="form-group">
                    	<label for="name">Song Name</label>
                    	<input type="text" id="name" name="name" class="form-control" placeholder="Oe lu Eana Hufwe" value="<?php echo set_value('name'); ?>">
                    </div>

                    <div class="form-horizontal">
                    	<div class="input-group form-group" style="margin-bottom:0">
                    	    <label for="artist" class="col-xs-1 control-label">by</label>
                    	    <div class="col-xs-11" style="padding-right: 30px;">
                    	    	<div class="form-group input-group">
                    	    		<input type="text" id="artist" name="artist" value="<?php echo set_value('artist'); ?>" placeholder="Artist" class="form-control" style="-webkit-border-radius: 4px 0 0 4px;
                    	    		-moz-border-radius: 4px 0 0 4px;
                    	    		border-radius: 4px 0 0 4px;">
                    	    		<span class="input-group-addon" style="-webkit-border-radius: 0;
                    	    		                    	-moz-border-radius: 0;
                    	    		                    	border-radius: 0; margin: 0 -1px;">feat.</span>                    	 
                    	    		<input type="text" id="featuring" name="featuring" value="<?php echo set_value('featuring'); ?>" class="form-control" placeholder="(optional)">
                    	    	</div>
                    	    </div>
                    	    
                    	</div>
                    </div>
                    <div class="form-group">
                        <label for="album" class="pull-left">in</label>
                        <input type="text" class="form-control" placeholder="Album (Optional)"  value="<?php echo set_value('album'); ?>" id="album" name="album">
                    </div>
                    <div class="form-group">
                        <label class="pull-left" for="origin">Original Lyric</label>
                        <textarea rows="1" class="form-control" type="text" placeholder="(optional)" id="origin" name="origin"><?php echo set_value('origin'); ?></textarea>
                    </div>
                    <div class="form-group">
                        <label class="pull-left" for="translate">Translate lyric</label>
                        <textarea rows="1" class="form-control" type="text" placeholder="(optional)" id="translate" name="translate"><?php echo set_value('translate'); ?></textarea>
                    </div>
                    <div class="form-group">
                        <label class="pull-left" for="translator">Translator</label>
                        <input type="text" class="form-control" placeholder="(optional)" id="translator" value="<?php echo set_value('translator'); ?>"  name="translator">
                    </div>
                    <label for="comment">Comment</label>
                    <textarea name="comment" id="comment" name="comment" cols="30" rows="4" class="form-control" placeholder="(optional)"><?php echo set_value('comment'); ?></textarea>
                    <div>
                    <input type="submit" name="submit" value="Submit" class="btn btn-primary">
                    <input type="button" value="Draft" class="btn disabled">    
                    </div>
                    
                </div>

            </Form>
		</div>
		<?php $this->load->view('gy/footer');?>
	</div>
</body>
</html>