<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>System Configuration - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<div id="wrapper">
		<?php $this->load->view('admin/header');?>
		<div class="jumbotron header single-head admin-jumbotron">
			<div class="page-wrapper">
				<h2>System Configuration</h2>
			</div>
		</div>
		<div id="page-wrapper">
			<div class="row-fluid">
				<?php if(@$success==true){ ?>
                <div class="alert alert-success fade in ">
                    <a href="#" class="close" data-dismiss="alert">&times;</a>
                    <strong>Success!</strong> Edited.
                </div>
                <?php }?>
                <?php echo form_open('admin/config',array('class'=>'form-horizontal')); ?>
                    <div class="form-group">
                        <label for="title" class="col-sm-3 control-label">Website title</label>
                        <div class="col-sm-9">
                            <input type="text" class="form-control" id="title" name="title" value="<?=$items['title']?>">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="banner" class="col-sm-3 control-label">Banner Text</label>
                        <div class="col-sm-9"><input type="text" class="form-control" id="banner" name="banner" value="<?=$items['banner']?>"></div>
                    </div>
                    <div class="form-group">
                        <label for="subbanner" class="col-sm-3 control-label">Secondary Banner Text</label>
                        <div class="col-sm-9"><input type="text" class="form-control" id="subbanner" name="subbanner" value="<?=$items['subbanner']?>"></div>
                    </div>
                    <!--
                    div.form-group>label.col-sm-2 control-label[for=directory]{Directory}+.controls>input.input-xxlarge#directory[name=directory][value=<?=$items['directory']?>]
                    -->
                    <input type="submit" name="submit" value="Save" class="btn btn-primary">
                </form>
		
		</div>
		<?php $this->load->view('gy/footer');?>
	</div>

</body>
</html>