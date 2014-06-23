<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title><?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<script>var current_page='index';</script>
	<?php $this->load->view('gy/header');?>
	<div class="header jumbotron">
		<div class="container">
			<h1><?=$this->admin_model->get_config('banner');?></h1>
			<p class="lead"><?=$this->admin_model->get_config('subbanner');?></p>			
		</div>
	</div>
	<div class="container">
		<div class="row songbox-row">
			<?php foreach ($posts as $postitem): ?>
                <?php $this->load->view('templates/default/lyricbox-list',array("postitem" => $postitem)); ?>
			<?php endforeach ?>
			<div class="songbox-cont col-sm-12" >
				<?=$this->pagination->create_links();?>
			</div>
		</div>
	</div>
	<div class="modal fade" id="Del">
  		<div class="modal-dialog">
    		<div class="modal-content">
      			<div class="modal-header">
        			<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
        			<h4 class="modal-title">Confirm Delete</h4>
      			</div>
      		<div class="modal-body">
        		<p>Are you sure you want to delete the following item?</p>
				<p id="del_info">....</p>
      		</div>
      		<div class="modal-footer">
        		<a href="#" class="btn btn-default" data-dismiss="modal">Cancel</a>
        		<a href="#" class="btn btn-danger" id="btn-delete">Delete</a>
      		</div>
    		</div><!-- /.modal-content -->
  		</div><!-- /.modal-dialog -->
	</div><!-- /.modal -->
	<?php $this->load->view('gy/footer');?>
</body>
</html>