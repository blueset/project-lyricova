<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>System Configuration - <?=$this->admin_model->get_title();?></title>
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
				<h1>System Configuration</h1>
				<?php if(@$success==true){ ?>
				<div class="alert alert-success fade in ">
  					<a href="#" class="close" data-dismiss="alert">&times;</a>
  					<strong>Success!</strong> Edited.
				</div>
				<?php }?>
				<?php echo form_open('admin/config',array('class'=>'form-horizontal')); ?>
					<div class="control-group">
						<label for="title" class="control-label">Website title</label>
						<div class="controls">
							<input type="text" class="input-xxlarge" id="title" name="title" value="<?=$items['title']?>">
						</div>
					</div>
					<div class="control-group">
						<label for="banner" class="control-label">Banner Text</label>
						<div class="controls"><input type="text" class="input-xxlarge" id="banner" name="banner" value="<?=$items['banner']?>"></div>
					</div>
					<div class="control-group">
						<label for="subbanner" class="control-label">Secondary Banner Text</label>
						<div class="controls"><input type="text" class="input-xxlarge" id="subbanner" name="subbanner" value="<?=$items['subbanner']?>"></div>
					</div>
					<!--
					div.control-group>label.control-label[for=directory]{Directory}+.controls>input.input-xxlarge#directory[name=directory][value=<?=$items['directory']?>]
					-->
					<input type="submit" name="submit" value="Save" class="btn btn-primary">
				</form>
			</div>
			
		</div>

	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>