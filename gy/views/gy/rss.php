<?php 
	$s = array('&','<','>');
	$a = array('&#x26;','&#x3C;','&#x3E;');
 ?>
<?php echo '<?xml version="1.0" encoding="UTF-8" ?>'?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
	<channel>
		<title><?=str_replace($s,$a,$this->admin_model->get_title());?></title>
		<link><?=base_url();?></link>
		<description>
			<?=str_replace($s,$a,$this->admin_model->get_config('banner'))?> - <?=str_replace($s,$a,$this->admin_model->get_config('subbanner'))?>
		</description>
		<lastBuildDate><?=standard_date('DATE_RSS',human_to_unix($posts[1]->time))?></lastBuildDate>
		<?php foreach ($posts as $postitem): ?>
		<item>
			<title><?=str_replace($s,$a,$postitem->name)?> by <?=str_replace($s,$a,$postitem->artist)?> <?php if(!$postitem->featuring=="") {?>feat. <?=str_replace($s,$a,$postitem->featuring)?> <?php } ?><?php if(!$postitem->album==""){ ?>in <?=str_replace($s,$a,$postitem->album)?> <?php } ?></title>
			<link><?= base_url('/post/'.$postitem->id)?></link>
			<guid><?= base_url('/post/'.$postitem->id)?></guid>
			<comments><?= base_url('/post/'.$postitem->id)?>#comments</comments>
			<pubDate><?=standard_date('DATE_RSS',human_to_unix($postitem->time))?></pubDate>
			<dc:creator><?=str_replace($s,$a,$this->user_model->get_by_id($postitem->user_id)->display_name)?></dc:creator>
			<description><?=str_replace($s,$a,$this->typography->nl2br_except_pre($postitem->lyric))?></description>
		</item>
		<?php endforeach; ?>
	</channel>
</rss>