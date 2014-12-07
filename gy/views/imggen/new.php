<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Image Generator - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="jumbotron header single-head">
		<div class="container">
			<h2>
				<?=anchor('imggen/help','<i class="fa fa-question-circle"></i>','class="pull-right" style="color:white;" target="_blank"')?>
				Image Generator <small>Share your lyric with pictures</small>
			</h2>	
		</div>
	</div>
	<div class="container">
		<?php if(!validation_errors()==''){ ?>
		<div class="alert alert-error fade in alert-warning alert-dismissable">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong>Error!</strong> <?=validation_errors('<span>','</span>');?>
		</div>
		<?php } ?>
		<div class="row" >
		<?php echo form_open('imggen/new/'); ?>
			<div class="col-sm-6 col-md-6">
				<label for="lyric">Lyric</label>
				<textarea name="lyric" id="lyric" class="form-control" rows="6" placeholder="Lyrics here..."><?php if(isset($lyric)){echo($lyric);} ?></textarea>
				<label for="meta">Meta text</label>
				<input type="text" class="form-control" name="meta" id="meta" value="<?php if(isset($meta)){echo($meta);} ?>">
				<div class="row" style="margin-left: -15px;">
					<div class="col-sm-6 col-md-6">
						<label for="style">Text Position</label>
						<select name="style" id="style" class="form-control">
							<option value="tl">Top left</option>
							<option value="tc">Top center</option>
							<option value="tr">Top Right</option>
							<option value="cl">Center Left</option>
							<option value="cc" selected>Center</option>
							<option value="cr">Center Right</option>
							<option value="bl">Bottom left</option>
							<option value="bc">Bottom center</option>
							<option value="br">Bottom Right</option>
						</select>
						<label for="background">Background Picture <?=anchor('imggen/help#bg','<i class="fa fa-info-circle"></i>','style="color:grey;" target="_blank"')?></label>
						<?=form_dropdown('background', $bgarray, 1, 'class="form-control"');?>
					</div>
					<div class="col-sm-6 col-md-6">
						<label for="font">Font <?=anchor('imggen/help#fonts','<i class="fa fa-info-circle"></i>','style="color:grey;" target="_blank"')?></label>
						<select class="form-control" name="font" id="font">
                            <?php foreach ($fontlist as $font):?>
                            <?='<option value="'.$font->name.'">'.$font->caption."</option>"?>
                            <?php endforeach; ?>
                        </select>
						<label for="bgpos">Background Position</label>
											<?=form_dropdown('bgpos', array('1'=>'Top Left',
																			'2'=>'Top Center',
																			'3'=>'Top Right',
																			'4'=>'Center Left',
																			'5'=>'Center',
																			'6'=>'Center Right',
																			'7'=>'Bottom Left',
																			'8'=>'Bottom Center',
																			'9'=>'Bottom Right'), 1, 'class="form-control"');?>
					</div>
				</div>
				
				
				<div class="panel panel-default">
					<div class="panel-heading">
						<a class="panel-title accordion-toggle" data-toggle="collapse" data-parent="#more" href="#more">More Options</a>
					</div>
					<div id="more" class="panel-collapse collapse">
						<div class="panel-body">
							<div class="row" style="margin-left: -15px;">
								<div class="col-sm-6 col-md-6">
									<label for="size">Lyric Font Size</label>
									<input type="number" name="size" id="size" value="35" class="form-control">
									<label for="metasize">Meta Font Size</label>
									<input type="number" name="metasize" id="metasize" value="10" class="form-control">
									<label for="width">Picture Width</label>
									<input type="number" name="width" id="width" value="640" class="form-control">
									<label for="x_offset">X-offset</label>
									<input type="number" name="x_offset" id="x_offset" value="30" class="form-control">
									
									
								</div>
								<div class="col-sm-6 col-md-6">
									<label for="lineheight">Lyrics Line Height</label>
									<input type="number" name="lineheight" id="lineheight" value="50" class="form-control">
									<label for="metalineh">Meta Line Height</label>
									<input type="number" name="metalineh" id="metalineh" value="25" class="form-control">
									<label for="height">Picture Height</label>
									<input type="number" name="height" id="height" value="596" class="form-control">
									<label for="y_offset">Y-offset</label>
									<input type="number" name="y_offset" id="y_offset" value="30" class="form-control">
									
								</div>
								
							</div>
							<label for="textcolor">Text Color</label>
							<select name="textcolor" id="textcolor" class="form-control">
									<option value="w" selected>White (For dark backgrounds)</option>
									<option value="b">Black (For bright backgrounds)</option>
								</select>
						</div>
					</div>
				</div>
				<input type="submit" name="submit" value="Submit" class="btn btn-primary form-control">
			</div>
			</Form>
			<div class="col-sm-6 col-md-6">
				
				<div class="form-inline">
					<label for="postid">Import Post by ID: </label>
					<input type="text" name="podtid" id="postid" class="form-control">
					<a href="javascript:void(0)" onclick="loadpost()"class="btn btn-default form-control">Get</a>
				</div>
				<div class="imggen-preview">
					<img src="<?=site_url('imggen/output')?>" alt="Preview">
				</div>
				
					
				</div>
				
			</div>
		</div>
		
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>