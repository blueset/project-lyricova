<?php 
	$s = array('&','<','>');
	$a = array('&#x26;','&#x3C;','&#x3E;');
 ?>
<rss version="2.0">
	<channel>
		<title><?=str_replace($s,$a,$this->admin_model->get_title());?></title>
		<link><?=base_url();?></link>
		<description>
			<?=str_replace($s,$a,$this->admin_model->get_config('banner'))?> - <?=str_replace($s,$a,$this->admin_model->get_config('subbanner'))?>
		</description>
		<lastBuildDate><?=$posts[1]->time?></lastBuildDate>
	</channel>
	<?php foreach ($posts as $postitem): ?>
	<item>
		<title><?=str_replace($s,$a,$postitem->name)?> by <?=str_replace($s,$a,$postitem->artist)?> <?php if(!$postitem->featuring=="") {?>feat. <?=str_replace($s,$a,$postitem->featuring)?> <?php } ?><?php if(!$postitem->album==""){ ?>in <?=str_replace($s,$a,$postitem->album)?> <?php } ?></title>
		<link><?= base_url('/post/'.$postitem->id)?></link>
		<comments><?= base_url('/post/'.$postitem->id)?>#comments</comments>
		<pubDate><?=$postitem->time?></pubDate>
		<author><?=str_replace($s,$a,$this->user_model->get_by_id($postitem->user_id)->display_name)?></author>
		<description><?=str_replace($s,$a,$this->typography->nl2br_except_pre($postitem->lyric))?></description>
	</item>
	<?php endforeach; ?>
</rss>