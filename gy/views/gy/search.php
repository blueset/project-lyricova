<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Search result - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="jumbotron header">
		<div class="container">
			<h1>Search result</h1>
			<p class="lead">Searching “<?=$keyword?>” with <?=$count?> <?php if($count > 1){echo 'results';}else{echo "result";} ?>.</p>			
		</div>
	</div>
	<div class="container">
		<?php if($count > 20): ?>
			<div class="alert alert-info">
				<strong>Only first 20 result </strong>is displayed.
			</div>
		<?php endif; ?>
		<?php if($count < 1): ?>
			<div class="alert alert-error clear-fix alert-warning">
				<strong>No result</strong> found with your query. Please try to rewrite your query.
			</div>
		<?php endif; ?>
		<div class="row songbox-row">
			<?php foreach ($posts as $postitem): ?>
                <?php $this->load->view('templates/default/lyricbox-list',array("postitem" => $postitem)); ?>
			<?php endforeach ?>
			<?php //$this->pagination->create_links(); ?>
		</div>
	</div>
	<div class="modal hide" id="Del">
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal">×</button>
			<h3>Confirm Delete</h3>
		</div>
		<div class="modal-body">
			<p>Are you sure you want to delete the following item?</p>
			<p id="del_info">....</p>
		</div>
		<div class="modal-footer">
			<a href="#" class="btn btn-danger" id="btn-delete">Delete</a>
			<a href="#" data-dismiss="modal" class="btn btn-primary">Cancel</a>
		</div>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>