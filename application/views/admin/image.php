<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Edit Images - <?=$this->admin_model->get_title();?></title>
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
				<h1>List of image generated</h1>
				<?php if($success){ ?>
				<div class="alert alert-success fade in ">
  					<a href="#" class="close" data-dismiss="alert">&times;</a>
  					<strong>Success!</strong> Image Deleted. 
				</div>
				<?php }?>
				<?php if(!$errinfo==''){ ?>
				<div class="alert alert-error fade in ">
  					<a href="#" class="close" data-dismiss="alert">&times;</a>
  					<strong>Error!</strong> <?=$errinfo?>
				</div>
				<?php } ?>
				<table class="table table-hover text-left post-list"><tbody>
					<tr>
						<!--<th><input type="checkbox" name="post-all" id="post-all"></th>-->
						<th>ID</th>
						<th>Meta</th>
						<th>Lyric</th>
						<th>Action</th>
					</tr>
					<?php foreach ($posts as $postitem): ?>
					<tr>
						<!--<td class="tick"><input type="checkbox" name="post-<?=$postitem->id?>" id="post-<?=$postitem->id?>"></td>-->
						<td class="id"><?=$postitem->id?></td>
						<td class="name"><?=$postitem->meta?></td>
						<td class="lyric"><?=$postitem->lyric?></td>
						<td class="action">							
							<?=anchor('imggen/edit/'.$postitem->id, 'Edit', 'class="btn btn-small btn-primary"');?>
							<?=anchor('imggen/output/'.$postitem->id.'.png', 'Open', 'class="btn btn-small"');?>
							<a href="javascript:void(0)" class="btn btn-danger btn-small" onclick="delImgModal(<?=$page?>,<?=$postitem->id?>,'<?=jsize_string($postitem->lyric)?>');">Delete</a>
						</td>
					</tr>
					<?php endforeach; ?>
				<tbody></table>

			</div>
			
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