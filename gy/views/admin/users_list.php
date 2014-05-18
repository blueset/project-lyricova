<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Users List - <?=$this->admin_model->get_title();?></title>
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
				<h1>User list <small>Page <?=$page?></small></h1>
				<table class="table table-hover text-left post-list"><tbody>
					<tr>
						<!--<th><input type="checkbox" name="post-all" id="post-all"></th>-->
						<th>ID</th>
						<th>Name</th>
						<th>Email Address</th>
						<th>Display Name</th>
						<th>Action</th>
					</tr>
					<?php foreach ($posts as $postitem): ?>
					<tr>
						<!--<td class="tick"><input type="checkbox" name="post-<?=$postitem->id?>" id="post-<?=$postitem->id?>"></td>-->
						<td class="id"><?=$postitem->id?></td>
						<td class="name"><?=$postitem->username?></td>
						<td class="lyric"><?=$postitem->email?></td>
						<td class="author"><?=$postitem->display_name?></td>
						<td class="action">
							<?=anchor('admin/user_edit/'.$postitem->id, 'Edit', 'class="btn btn-small btn-primary"')?>
							<?='<a href="javascript:void(0)" class="btn btn-danger btn-small" onclick="delUserModal('.$postitem->id.",'".jsize_string($postitem->username)."')\">Delete</a>"; ?> 
						</td>
					</tr>
					<?php endforeach; ?>
				<tbody></table>
				<?=$this->pagination->create_links();?>
			</div>
			
		</div>

	</div>
	<div class="modal hide" id="Del">
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal">×</button>
			<h3>Confirm Delete</h3>
		</div>
		<div class="modal-body">
			<p>Are you sure you want to delete the following user?</p>
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