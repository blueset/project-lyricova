<div class="span2 main-menu-span">
	<div class="well nav-collapse sidebar-nav">
	<ul class="nav nav-tabs nav-stacked main-menu">
		<li class="nav-header hidden-tablet">Menu</li>
		<li>
			<a href="<?=site_url('admin/dashboard');?>" class="ajaxlink">
				<i class="icon-home"></i> <span class="hidden-tablet">Dashboard</span>
			</a>
		</li>
		<?php if($this->user_model->access_to("system_admin")===TRUE): ?>
		<li>
			<a href="<?=site_url('admin/config');?>" class="ajaxlink">
				<i class="icon-wrench"></i> System
			</a>
		</li>
		<?php endif; if($this->user_model->access_to("post")===TRUE):  ?>
		<li>
			<a href="<?=site_url('admin/post');?>" class="ajaxlink">
				<i class="icon-plus"></i> Post
			</a>
		</li>
		<?php endif; if($this->user_model->access_to("edit")===TRUE):  ?>
		<li>
			<a href="<?=site_url('admin/edit_list');?>" class="ajaxlink">
				<i class="icon-edit"></i> Edit
			</a>
		</li>
		<?php endif;?>
		<li>
			<a href="<?=site_url('admin/profile');?>" class="ajaxlink">
				<i class="icon-user"></i> Profile
			</a>
		</li>
		<?php if($this->user_model->access_to("system_admin")===TRUE):  ?>
		<li>
			<a href="<?=site_url('admin/image');?>" class="ajaxlink">
				<i class="icon-picture"></i> Images
			</a>
		</li>
	<?php endif; ?>

		<!--
		li>a.ajaxlink[href=<?=site_url('admin/config');?>]>i.icon-wrench+{ System}
		-->
	</ul>
	</div>
</div>