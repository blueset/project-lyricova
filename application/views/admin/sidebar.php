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
				<i class="icon-wrench"></i><span class="hidden-tablet"> System</span>
			</a>
		</li>
		<?php endif; if($this->user_model->access_to("post")===TRUE):  ?>
		<li>
			<a href="<?=site_url('admin/post');?>" class="ajaxlink">
				<i class="icon-plus"></i><span class="hidden-tablet"> Post</span>
			</a>
		</li>
		<?php endif; if($this->user_model->access_to("edit")===TRUE):  ?>
		<li>
			<a href="<?=site_url('admin/edit_list');?>" class="ajaxlink">
				<i class="icon-edit"></i><span class="hidden-tablet"> Edit</span>
			</a>
		</li>
		<?php endif;?>
		<li>
			<a href="<?=site_url('admin/profile');?>" class="ajaxlink">
				<i class="icon-user"></i><span class="hidden-tablet"> Profile</span>
			</a>
		</li>
		<?php if($this->user_model->access_to("system_admin")===TRUE):  ?>
		<li>
			<a href="<?=site_url('admin/image');?>" class="ajaxlink">
				<i class="icon-picture"></i><span class="hidden-tablet"> Images</span>
			</a>
		</li>
		<li>
			<a href="<?=site_url('admin/users_list');?>" class="ajaxlink">
				<i class="icon-group"></i><span class="hidden-tablet"> Users</span>
			</a>
		</li>
	<?php endif; ?>

		<!--
		li>a.ajaxlink[href=<?=site_url('admin/config');?>]>i.icon-wrench+span.hidden-tablet{ System}
		-->
	</ul>
	</div>
</div>