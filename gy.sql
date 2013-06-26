SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;


DROP TABLE IF EXISTS `GY_config`;
CREATE TABLE IF NOT EXISTS `GY_config` (
  `name` varchar(20) NOT NULL,
  `value` varchar(500) NOT NULL,
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `GY_config` (`name`, `value`) VALUES
('banner', 'Project Gy'),
('subbanner', 'Yet another lyric blog'),
('title', 'Project Gy');

DROP TABLE IF EXISTS `GY_imggen`;
CREATE TABLE IF NOT EXISTS `GY_imggen` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lyric` text NOT NULL,
  `meta` varchar(300) NOT NULL,
  `style` varchar(5) NOT NULL,
  `font` varchar(50) NOT NULL,
  `background` varchar(50) NOT NULL,
  `size` int(10) NOT NULL,
  `lineheight` int(10) NOT NULL,
  `metasize` int(10) NOT NULL,
  `metalineh` int(10) NOT NULL,
  `width` int(10) NOT NULL,
  `height` int(10) NOT NULL,
  `textcolor` varchar(5) NOT NULL,
  `x_offset` int(10) NOT NULL,
  `y_offset` int(10) NOT NULL,
  `bgpos` int(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=10 ;

DROP TABLE IF EXISTS `GY_posts`;
CREATE TABLE IF NOT EXISTS `GY_posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lyric` text NOT NULL,
  `name` varchar(200) NOT NULL,
  `artist` varchar(200) NOT NULL,
  `featuring` varchar(100) NOT NULL,
  `album` varchar(200) NOT NULL,
  `origin` text NOT NULL,
  `translate` text NOT NULL,
  `translator` varchar(200) NOT NULL,
  `comment` text NOT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  FULLTEXT KEY `lyric` (`lyric`),
  FULLTEXT KEY `name` (`name`),
  FULLTEXT KEY `artist` (`artist`),
  FULLTEXT KEY `featuring` (`featuring`),
  FULLTEXT KEY `album` (`album`),
  FULLTEXT KEY `origin` (`origin`),
  FULLTEXT KEY `translate` (`translate`),
  FULLTEXT KEY `translator` (`translator`),
  FULLTEXT KEY `comment` (`comment`),
  FULLTEXT KEY `comment_2` (`comment`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=32 ;

DROP TABLE IF EXISTS `GY_users`;
CREATE TABLE IF NOT EXISTS `GY_users` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `username` varchar(20) NOT NULL,
  `password` char(32) NOT NULL,
  `email` varchar(60) NOT NULL,
  `display_name` varchar(200) NOT NULL,
  `role` int(2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=2 ;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
