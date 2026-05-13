-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 103.191.208.56:3306
-- Generation Time: Mar 30, 2026 at 09:18 AM
-- Server version: 11.4.10-MariaDB-ubu2404
-- PHP Version: 8.3.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `flash_643_employee`
--

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `blogs`
--

CREATE TABLE `blogs` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `blogs`
--

INSERT INTO `blogs` (`id`, `title`, `image_path`, `content`, `created_by`, `created_at`) VALUES
(1, 'Test', 'uploads/blogs/699836690091e_ChatGPT Image Dec 28, 2025, 02_37_12 PM.png', 'test1\r\n', 1, '2026-02-20 15:54:41');

-- --------------------------------------------------------

--
-- Table structure for table `broadcast_messages`
--

CREATE TABLE `broadcast_messages` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message_type` enum('text','image','video') DEFAULT 'text',
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `broadcast_messages`
--

INSERT INTO `broadcast_messages` (`id`, `user_id`, `message_type`, `content`, `created_at`) VALUES
(2, 17, 'text', 'Hi', '2026-02-13 19:15:01'),
(3, 8, 'text', 'hi\r\n', '2026-02-20 07:12:40');

-- --------------------------------------------------------

--
-- Table structure for table `dream_projects`
--

CREATE TABLE `dream_projects` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `dream` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `dream_projects`
--

INSERT INTO `dream_projects` (`id`, `user_id`, `dream`, `created_at`, `updated_at`) VALUES
(1, 1, 'Dream project is to neutralize the existing underwater autonomous vehicles with maximum possibilty that is hidden', '2026-02-03 10:05:03', '2026-02-03 10:05:03'),
(2, 15, 'Dream Project is to increase the latency of Anamoly Detection and also Finding the root cause of anamoly.', '2026-02-04 13:59:11', '2026-02-04 13:59:11'),
(3, 21, 'I want to create a code generation ai that should access all files and do all the stuff by itself.', '2026-02-05 11:08:58', '2026-02-05 11:08:58'),
(4, 16, 'My dream project would be to create a Civic Sense monitor, which detects and tracks the moments of the people, and take action against them accordingly.', '2026-02-05 11:15:39', '2026-02-05 11:15:39'),
(5, 14, 'A personal finance system for individuals and families to manage daily expenses and plan for future needs. It studies income, spending, and upcoming costs to give simple advice on saving money and avoiding financial problems.', '2026-02-07 11:52:27', '2026-02-07 11:52:27');

-- --------------------------------------------------------

--
-- Table structure for table `employee_profiles`
--

CREATE TABLE `employee_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `date_of_joining` date DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `emergency_contact` varchar(100) DEFAULT NULL,
  `emergency_phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `linkedin_url` varchar(255) DEFAULT NULL,
  `github_url` varchar(255) DEFAULT NULL,
  `portfolio_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employee_profiles`
--

INSERT INTO `employee_profiles` (`id`, `user_id`, `phone`, `date_of_joining`, `department`, `position`, `bio`, `profile_photo`, `address`, `emergency_contact`, `emergency_phone`, `created_at`, `updated_at`, `linkedin_url`, `github_url`, `portfolio_url`) VALUES
(1, 1, '+919502901416', '2025-12-17', 'AIML', 'Python and PHP devoloper intern', '', 'profile_1_1770214609.jpeg', 'Y. M. R Colony, proddatur', 'Krishna', '9290075221', '2026-02-02 12:31:33', '2026-02-04 14:16:49', NULL, NULL, NULL),
(7, 11, '+918866831130', '2026-02-02', '', 'PHP developer intern', '', 'profile_11_1770266586.jpg', '2402, Ayodhya nagar, linkroad, bharuch - 392001, Gujarat', 'Jankhana', '+919725521968', '2026-02-03 12:41:08', '2026-02-05 04:43:06', NULL, NULL, NULL),
(8, 12, '+91 9110300608', '2026-01-27', 'IT', 'Python developer intern', 'I', NULL, 'charlapali, sai dwarakapuri colony 81,phase 2, nalgonda', 'siddhu', '8341332281', '2026-02-03 12:45:06', '2026-02-03 12:45:06', NULL, NULL, NULL),
(9, 16, '9100720513', '2026-02-02', 'Python', 'Python Developer Intern', '', 'profile_16_1770122767.jpeg', 'Dulapally, Kompally, Hyderabad', 'Aparna', '+91 9160124154', '2026-02-03 12:46:07', '2026-02-06 14:24:51', '', '', ''),
(11, 15, '7780720117', '2005-07-08', 'Engineering', 'Python Intern', 'AIML Enthusiast with strong hands on Experience in Python, ML, DL and NLP. Always eager to learn new technologies, take on challenges, and grow in the field of AI, ML, and Data Science.\r\nCurious mind. Data-driven thinker. Ready to contribute.', 'profile_15_1770122899.jpg', 'Telangana, Jagityal Dist, Korutla, H-No-1-1-1027', 'B. Jayakrishna', '9959289554', '2026-02-03 12:48:19', '2026-02-03 12:48:26', NULL, NULL, NULL),
(12, 14, '+919747751235', '2026-01-12', '', 'PHP Developer Intern', 'I have previous experience in Core PHP and MySQL, aiming to learn new technologies and skills .\r\nI am very passionate about coding and want to make meaningful contribution to the company and grow further as a developer.', 'profile_14_1770212444.jpg', '#46, Srilakshmi Venkateswara Nilaya, 7th A Cross\r\nPragathi Nagar, Electronic City, Bangalore', 'Deepak Jose', '6282646771', '2026-02-03 12:53:53', '2026-02-04 13:40:44', NULL, NULL, NULL),
(13, 18, '9493541929', '0000-00-00', '', '', '', 'profile_18_1770139404.jpeg', '', '', '', '2026-02-03 17:23:24', '2026-02-03 17:23:35', NULL, NULL, NULL),
(14, 10, '7348947492', '2025-11-03', '', '', '', 'profile_10_1770188397.jpeg', 'Bangalore', 'Gurulakshmi', '9663583089', '2026-02-04 06:58:39', '2026-02-04 07:00:43', NULL, NULL, NULL),
(19, 20, '', '2026-01-19', 'Developer', 'Python Intern', 'I\'m Shubham A full stack developer having good command with website devlopment and good interest in cybersecurity.\r\n', NULL, '', 'Shivam', '9135176176', '2026-02-04 13:38:08', '2026-02-04 13:38:08', NULL, NULL, NULL),
(21, 21, '+ 9110300608', '2026-01-27', 'IT', 'Python dev', 'i am python developer and interested in IOT.Love Guitar and stocks.', 'profile_21_1770662208.jpg', 'sri indu college of engineering, hyderabad', 'siddhu', '8341332281', '2026-02-04 14:10:47', '2026-02-09 18:36:48', NULL, NULL, NULL),
(23, 17, '+918848645354', '0000-00-00', 'tech', '', '', 'profile_17_1770467255.jpeg', '', 'Mother', '7306555017', '2026-02-05 03:23:42', '2026-02-10 15:58:33', '', '', ''),
(34, 22, '6360448226', '2026-03-25', 'Engineering ', 'Python developer intern ', '', 'profile_22_1774444230.webp', 'Bengaluru ', '', '', '2026-03-25 13:05:57', '2026-03-25 13:10:30', 'https://www.linkedin.com/in/rachana-n-b-1780b527b?utm_source=share_via&utm_content=profile&utm_medium=member_android', '', '');

-- --------------------------------------------------------

--
-- Table structure for table `games`
--

CREATE TABLE `games` (
  `id` varchar(50) NOT NULL,
  `game_type` varchar(20) NOT NULL,
  `status` varchar(20) NOT NULL,
  `game_data` longtext NOT NULL,
  `created_at` int(11) NOT NULL,
  `last_move_at` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `games`
--

INSERT INTO `games` (`id`, `game_type`, `status`, `game_data`, `created_at`, `last_move_at`) VALUES
('game_698b28d6ab679', 'tictactoe', 'finished', '{\n    \"id\": \"game_698b28d6ab679\",\n    \"game_type\": \"tictactoe\",\n    \"host_id\": 1,\n    \"host_name\": \"Varshith\",\n    \"guest_id\": 10,\n    \"guest_name\": \"Anjali\",\n    \"board\": [\n        \"O\",\n        \"X\",\n        \"O\",\n        \"X\",\n        \"X\",\n        \"O\",\n        \"X\",\n        \"O\",\n        \"X\"\n    ],\n    \"current_turn\": 1,\n    \"status\": \"finished\",\n    \"winner\": \"draw\",\n    \"bet_amount\": \"50\",\n    \"bet_type\": \"money\",\n    \"created_at\": 1770727638,\n    \"last_move_at\": 1770727889,\n    \"spectators\": []\n}', 1770727638, 1770727889),
('game_698b29ece2751', 'connect4', 'finished', '{\n    \"id\": \"game_698b29ece2751\",\n    \"game_type\": \"connect4\",\n    \"host_id\": 10,\n    \"host_name\": \"Anjali\",\n    \"guest_id\": 1,\n    \"guest_name\": \"Varshith\",\n    \"board\": [\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"Y\",\n        \"\",\n        \"\",\n        \"Y\",\n        \"\",\n        \"\",\n        \"\",\n        \"Y\",\n        \"\",\n        \"R\",\n        \"R\",\n        \"\",\n        \"\",\n        \"\",\n        \"Y\",\n        \"R\",\n        \"R\",\n        \"Y\",\n        \"R\",\n        \"R\",\n        \"\",\n        \"Y\"\n    ],\n    \"current_turn\": 1,\n    \"status\": \"finished\",\n    \"winner\": 1,\n    \"bet_amount\": \"1\",\n    \"bet_type\": \"coffee\",\n    \"created_at\": 1770727916,\n    \"last_move_at\": 1770727984,\n    \"spectators\": []\n}', 1770727916, 1770727984),
('game_698b2a4075612', 'pictionary', 'active', '{\n    \"id\": \"game_698b2a4075612\",\n    \"game_type\": \"pictionary\",\n    \"host_id\": 10,\n    \"host_name\": \"Anjali\",\n    \"teams\": {\n        \"A\": {\n            \"players\": [\n                {\n                    \"id\": 10,\n                    \"name\": \"Anjali\"\n                }\n            ],\n            \"score\": 0\n        },\n        \"B\": {\n            \"players\": [],\n            \"score\": 0\n        }\n    },\n    \"current_word\": \"\",\n    \"current_drawer_team\": \"A\",\n    \"current_guesser_team\": \"B\",\n    \"round\": 0,\n    \"max_rounds\": 5,\n    \"drawing_data\": [\n        {\n            \"x\": 117.1003717472119,\n            \"y\": 216.31076388888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 117.1003717472119,\n            \"y\": 215.1996527777778,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 115.98513011152417,\n            \"y\": 209.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 111.52416356877323,\n            \"y\": 201.86631944444446,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 103.71747211895911,\n            \"y\": 190.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 102.60223048327138,\n            \"y\": 187.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 97.02602230483272,\n            \"y\": 178.53298611111111,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 91.44981412639406,\n            \"y\": 167.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 89.2193308550186,\n            \"y\": 159.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 89.2193308550186,\n            \"y\": 152.97743055555557,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 89.2193308550186,\n            \"y\": 146.31076388888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 89.2193308550186,\n            \"y\": 138.53298611111111,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 89.2193308550186,\n            \"y\": 124.08854166666667,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 92.56505576208178,\n            \"y\": 109.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 99.25650557620818,\n            \"y\": 92.97743055555556,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 103.71747211895911,\n            \"y\": 85.19965277777779,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 108.17843866171005,\n            \"y\": 76.31076388888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 117.1003717472119,\n            \"y\": 64.08854166666667,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 129.36802973977694,\n            \"y\": 46.31076388888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 141.635687732342,\n            \"y\": 35.19965277777778,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 156.13382899628255,\n            \"y\": 24.088541666666668,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 173.97769516728624,\n            \"y\": 12.977430555555555,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 256.50557620817847,\n            \"y\": 111.86631944444444,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 249.81412639405204,\n            \"y\": 117.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 246.46840148698885,\n            \"y\": 121.86631944444444,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 242.00743494423793,\n            \"y\": 126.3107638888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 239.77695167286245,\n            \"y\": 127.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 238.66171003717474,\n            \"y\": 129.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 382.5278810408922,\n            \"y\": 134.08854166666669,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 357.9925650557621,\n            \"y\": 147.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 352.41635687732344,\n            \"y\": 149.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 351.3011152416357,\n            \"y\": 150.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 351.3011152416357,\n            \"y\": 150.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 350.18587360594796,\n            \"y\": 150.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 347.9553903345725,\n            \"y\": 151.86631944444446,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 343.4944237918216,\n            \"y\": 154.08854166666669,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 339.03345724907064,\n            \"y\": 155.19965277777777,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 331.2267657992565,\n            \"y\": 157.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 325.65055762081784,\n            \"y\": 159.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 322.30483271375465,\n            \"y\": 159.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 317.84386617100375,\n            \"y\": 160.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 316.728624535316,\n            \"y\": 160.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 310.0371747211896,\n            \"y\": 161.86631944444446,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 306.69144981412643,\n            \"y\": 161.86631944444446,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 302.2304832713755,\n            \"y\": 162.97743055555557,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 284.3866171003718,\n            \"y\": 165.19965277777777,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 264.31226765799255,\n            \"y\": 167.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 258.7360594795539,\n            \"y\": 167.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 249.81412639405204,\n            \"y\": 168.53298611111111,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 244.2379182156134,\n            \"y\": 168.53298611111111,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 237.546468401487,\n            \"y\": 171.86631944444446,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 236.43122676579927,\n            \"y\": 174.08854166666669,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 236.43122676579927,\n            \"y\": 175.19965277777777,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 235.31598513011153,\n            \"y\": 181.86631944444446,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 231.97026022304834,\n            \"y\": 196.31076388888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 231.97026022304834,\n            \"y\": 215.1996527777778,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 233.08550185873608,\n            \"y\": 220.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 235.31598513011153,\n            \"y\": 222.97743055555557,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 237.546468401487,\n            \"y\": 224.08854166666669,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 374.7211895910781,\n            \"y\": 142.97743055555557,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 354.6468401486989,\n            \"y\": 140.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 339.03345724907064,\n            \"y\": 140.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 325.65055762081784,\n            \"y\": 140.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 300,\n            \"y\": 146.31076388888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 277.69516728624535,\n            \"y\": 155.19965277777777,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 260.96654275092936,\n            \"y\": 165.19965277777777,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 257.6208178438662,\n            \"y\": 169.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 234.2007434944238,\n            \"y\": 195.1996527777778,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 233.08550185873608,\n            \"y\": 198.53298611111111,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 226.39405204460968,\n            \"y\": 230.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 226.39405204460968,\n            \"y\": 252.97743055555557,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 226.39405204460968,\n            \"y\": 256.3107638888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 230.8550185873606,\n            \"y\": 268.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 242.00743494423793,\n            \"y\": 278.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 250.92936802973978,\n            \"y\": 282.97743055555554,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 257.6208178438662,\n            \"y\": 286.3107638888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 264.31226765799255,\n            \"y\": 288.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 266.542750929368,\n            \"y\": 289.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 267.6579925650558,\n            \"y\": 289.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 268.7732342007435,\n            \"y\": 290.75520833333337,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 274.34944237918216,\n            \"y\": 290.75520833333337,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 279.9256505576208,\n            \"y\": 290.75520833333337,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 289.96282527881044,\n            \"y\": 290.75520833333337,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 310.0371747211896,\n            \"y\": 286.3107638888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 320.0743494423792,\n            \"y\": 282.97743055555554,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 337.9182156133829,\n            \"y\": 276.3107638888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 347.9553903345725,\n            \"y\": 272.97743055555554,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 361.3382899628253,\n            \"y\": 267.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 368.02973977695166,\n            \"y\": 262.97743055555554,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 375.8364312267658,\n            \"y\": 258.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 378.0669144981413,\n            \"y\": 256.3107638888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 386.9888475836431,\n            \"y\": 235.1996527777778,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 390.3345724907063,\n            \"y\": 218.53298611111111,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 391.4498141263941,\n            \"y\": 204.08854166666669,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 391.4498141263941,\n            \"y\": 186.31076388888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 385.8736059479554,\n            \"y\": 147.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 375.8364312267658,\n            \"y\": 125.19965277777779,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 366.91449814126395,\n            \"y\": 119.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 360.2230483271376,\n            \"y\": 117.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 349.07063197026025,\n            \"y\": 117.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 336.80297397769516,\n            \"y\": 117.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 330.1115241635688,\n            \"y\": 118.53298611111111,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 321.18959107806694,\n            \"y\": 122.97743055555556,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 311.1524163568773,\n            \"y\": 128.53298611111111,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 289.96282527881044,\n            \"y\": 144.08854166666669,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 279.9256505576208,\n            \"y\": 152.97743055555557,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 255.3903345724907,\n            \"y\": 211.86631944444446,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 255.3903345724907,\n            \"y\": 219.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 255.3903345724907,\n            \"y\": 229.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 256.50557620817847,\n            \"y\": 236.31076388888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 259.85130111524165,\n            \"y\": 245.1996527777778,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 264.31226765799255,\n            \"y\": 249.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 273.23420074349445,\n            \"y\": 250.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 287.73234200743497,\n            \"y\": 251.86631944444446,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 296.6542750929368,\n            \"y\": 251.86631944444446,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 310.0371747211896,\n            \"y\": 251.86631944444446,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 349.07063197026025,\n            \"y\": 236.31076388888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 384.75836431226764,\n            \"y\": 207.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 399.2565055762082,\n            \"y\": 189.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 411.52416356877325,\n            \"y\": 172.97743055555557,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 433.8289962825279,\n            \"y\": 141.86631944444446,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 441.63568773234203,\n            \"y\": 130.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 447.2118959107807,\n            \"y\": 120.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 451.6728624535316,\n            \"y\": 114.08854166666667,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 459.47955390334573,\n            \"y\": 101.86631944444444,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 465.0557620817844,\n            \"y\": 87.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 466.17100371747216,\n            \"y\": 70.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 466.17100371747216,\n            \"y\": 62.97743055555556,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 463.9405204460967,\n            \"y\": 56.31076388888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 456.13382899628255,\n            \"y\": 52.97743055555556,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 453.90334572490707,\n            \"y\": 52.97743055555556,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 450.5576208178439,\n            \"y\": 52.97743055555556,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 434.9442379182156,\n            \"y\": 52.97743055555556,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 419.3308550185874,\n            \"y\": 52.97743055555556,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 404.8327137546469,\n            \"y\": 55.19965277777778,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 394.79553903345726,\n            \"y\": 58.532986111111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 386.9888475836431,\n            \"y\": 61.86631944444445,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 382.5278810408922,\n            \"y\": 64.08854166666667,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 371.3754646840149,\n            \"y\": 67.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 321.18959107806694,\n            \"y\": 84.08854166666667,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 300,\n            \"y\": 89.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 279.9256505576208,\n            \"y\": 97.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 242.00743494423793,\n            \"y\": 107.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 180.66914498141264,\n            \"y\": 127.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 172.86245353159853,\n            \"y\": 130.75520833333334,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 159.47955390334573,\n            \"y\": 135.19965277777777,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 146.09665427509293,\n            \"y\": 139.64409722222223,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 129.36802973977694,\n            \"y\": 151.86631944444446,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 126.02230483271376,\n            \"y\": 157.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 121.56133828996283,\n            \"y\": 165.19965277777777,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 108.17843866171005,\n            \"y\": 201.86631944444446,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 98.14126394052045,\n            \"y\": 228.53298611111111,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 89.2193308550186,\n            \"y\": 254.08854166666669,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 89.2193308550186,\n            \"y\": 257.421875,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 89.2193308550186,\n            \"y\": 258.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 89.2193308550186,\n            \"y\": 258.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 98.14126394052045,\n            \"y\": 258.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 100.37174721189591,\n            \"y\": 258.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 102.60223048327138,\n            \"y\": 258.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 103.71747211895911,\n            \"y\": 258.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 105.94795539033457,\n            \"y\": 258.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 115.98513011152417,\n            \"y\": 258.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 119.33085501858737,\n            \"y\": 258.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 130.48327137546468,\n            \"y\": 258.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 138.28996282527882,\n            \"y\": 258.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 151.6728624535316,\n            \"y\": 256.3107638888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 273.23420074349445,\n            \"y\": 202.97743055555557,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 255.3903345724907,\n            \"y\": 308.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 238.66171003717474,\n            \"y\": 308.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 178.4386617100372,\n            \"y\": 308.53298611111114,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 120.4460966542751,\n            \"y\": 306.3107638888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"x\": 35.687732342007436,\n            \"y\": 306.3107638888889,\n            \"color\": \"#000\",\n            \"size\": 3,\n            \"type\": \"draw\"\n        },\n        {\n            \"type\": \"clear\"\n        }\n    ],\n    \"guesses\": [],\n    \"round_start_time\": null,\n    \"round_duration\": 60,\n    \"status\": \"active\",\n    \"winner\": null,\n    \"bet_amount\": \"1\",\n    \"bet_type\": \"coffee\",\n    \"created_at\": 1770728000,\n    \"last_move_at\": 1770728021,\n    \"guest_id\": 1,\n    \"guest_name\": \"Varshith\"\n}', 1770728000, 1770728021),
('game_698b37a94ba84', 'tictactoe', 'active', '{\n    \"id\": \"game_698b37a94ba84\",\n    \"game_type\": \"tictactoe\",\n    \"host_id\": 1,\n    \"host_name\": \"Varshith\",\n    \"guest_id\": 18,\n    \"guest_name\": \"Paardhiv Reddy Tumma\",\n    \"board\": [\n        \"X\",\n        \"\",\n        \"X\",\n        \"\",\n        \"O\",\n        \"\",\n        \"\",\n        \"\",\n        \"\"\n    ],\n    \"current_turn\": 18,\n    \"status\": \"active\",\n    \"winner\": null,\n    \"bet_amount\": \"50\",\n    \"bet_type\": \"money\",\n    \"created_at\": 1770731433,\n    \"last_move_at\": 1770817769,\n    \"spectators\": []\n}', 1770731433, 1770817769),
('game_698c87cf3df72', 'tictactoe', 'finished', '{\n    \"id\": \"game_698c87cf3df72\",\n    \"game_type\": \"tictactoe\",\n    \"host_id\": 1,\n    \"host_name\": \"Varshith\",\n    \"guest_id\": 18,\n    \"guest_name\": \"Paardhiv Reddy Tumma\",\n    \"board\": [\n        \"X\",\n        \"O\",\n        \"X\",\n        \"X\",\n        \"O\",\n        \"O\",\n        \"O\",\n        \"X\",\n        \"X\"\n    ],\n    \"current_turn\": 1,\n    \"status\": \"finished\",\n    \"winner\": \"draw\",\n    \"bet_amount\": \"200\",\n    \"bet_type\": \"money\",\n    \"created_at\": 1770817487,\n    \"last_move_at\": 1770817712,\n    \"spectators\": []\n}', 1770817487, 1770817712),
('game_698c894ff2b30', 'connect4', 'active', '{\n    \"id\": \"game_698c894ff2b30\",\n    \"game_type\": \"connect4\",\n    \"host_id\": 16,\n    \"host_name\": \"Sai Varsha\",\n    \"guest_id\": 1,\n    \"guest_name\": \"Varshith\",\n    \"board\": [\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\",\n        \"\"\n    ],\n    \"current_turn\": 16,\n    \"status\": \"active\",\n    \"winner\": null,\n    \"bet_amount\": \"1\",\n    \"bet_type\": \"coffee\",\n    \"created_at\": 1770817871,\n    \"last_move_at\": 1770901662,\n    \"spectators\": []\n}', 1770817871, 1770901662);

-- --------------------------------------------------------

--
-- Table structure for table `happy_sheet`
--

CREATE TABLE `happy_sheet` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `entry_date` date NOT NULL,
  `happy_today` text DEFAULT NULL,
  `happy_others` text DEFAULT NULL,
  `goals` text DEFAULT NULL,
  `dreams` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `happy_sheet`
--

INSERT INTO `happy_sheet` (`id`, `user_id`, `entry_date`, `happy_today`, `happy_others`, `goals`, `dreams`, `created_at`, `updated_at`) VALUES
(3, 1, '2026-02-03', 'Happy to share this website with the serphawk family', 'I hope everyone will feel better by escaping the confusing sheets', 'I want to make hardware product for ongoing project', 'Constant support from the team', '2026-02-03 06:55:11', '2026-02-03 06:55:11'),
(4, 11, '2026-02-03', 'happy bcz its my parents marriage anniversary', 'my friend is happy bcz i talked to her after long time', 'Personal-growth', '', '2026-02-03 12:41:53', '2026-02-03 12:41:53'),
(5, 14, '2026-02-03', 'Happy to learn new things like amazon q', 'My child is happy because I giving her a chance to spend time with the whole family', 'Gain more skills', '', '2026-02-03 12:47:50', '2026-02-03 12:47:50'),
(6, 16, '2026-02-03', 'Started Learning NLP', 'Mother felt happy for me by seeing me working ', 'I want to finish learning NLP', 'Develop my skills', '2026-02-03 12:51:28', '2026-02-03 12:51:28'),
(7, 15, '2026-02-03', 'I met the employee who working at Amazon and gain insights from their experience.', 'The person whom I met today felt happy that I said Iam working as as intern at Serph Hawk', 'Learning by Doing', '', '2026-02-03 12:53:42', '2026-02-03 12:53:42'),
(8, 12, '2026-02-03', 'being productive ', 'i shared some stocks and they are making profits today', 'going to gym 365 days', 'making me take actions instead of being lazy', '2026-02-03 12:54:15', '2026-02-03 12:54:15'),
(9, 17, '2026-02-03', 'I am happy to have been part of the interview process.', 'I made someone feel better by listening to them when they were stressed.', 'Maintaining a healthy life balance is a personal goal that brings me fulfillment.', '', '2026-02-03 13:30:11', '2026-02-03 13:30:11'),
(10, 18, '2026-02-03', 'i joined back my gym', 'i met my gym buddies after 3 months ', 'i wanna build the stock prediction application before the week end', '', '2026-02-03 17:19:20', '2026-02-03 17:19:20'),
(11, 20, '2026-02-04', 'I shared my experience with the team and was happy to help them understand what sir truly believes in us.', 'Helping the team gain clarity through shared experiences and discussions.', 'I am dedicated to delivering my best in everything I work on.', 'I aspire to be helpful and supportive whenever the team needs me.', '2026-02-04 12:59:44', '2026-02-04 12:59:44'),
(12, 11, '2026-02-04', 'Happy being included in new project', 'my mother is happy bcz i helped her', 'lerning codeigniter', '', '2026-02-04 13:00:17', '2026-02-04 13:00:17'),
(13, 16, '2026-02-04', 'Happy to see a Good Project - Health Agent ', ' I think Paardhiv felt happy when I complimented his project\'s UI', 'Learning NLP', 'Learn new technologies ', '2026-02-04 13:31:31', '2026-02-04 13:31:31'),
(14, 1, '2026-02-04', 'I got my go to dish from my sister', 'My nephew got some chocolates from me and she was so happy', 'Work-life balance', 'Serphawk can help me in making a good hardware devices', '2026-02-04 13:35:46', '2026-02-04 13:35:46'),
(15, 14, '2026-02-04', 'I am happy to have had a nice day learning new things.', 'My child and her grand mother is happy to see that i dress up my child the dress that grand mother has bought to her', 'I want to be more patient with my child every day.\r\n', '', '2026-02-04 13:36:19', '2026-02-04 13:36:19'),
(16, 15, '2026-02-04', 'Implementing the new feature in the code', 'Submitted the task to the team mate', 'focusing on technical part more', '', '2026-02-04 13:37:39', '2026-02-04 13:37:39'),
(17, 18, '2026-02-04', 'i bunked my college today and deployed the health agent', 'took my friends out to eat', 'need to look into new projects', '', '2026-02-04 13:41:02', '2026-02-04 13:41:02'),
(18, 17, '2026-02-04', 'A funny text with my friend', 'Have a  joke with my friend', 'Learning new skills,new goals.', 'My dream is to grow into a confident, high-impact professional, and this company can make that true by giving me the opportunity to learn, take responsibility, and contribute to meaningful projects', '2026-02-04 13:47:48', '2026-02-04 13:47:48'),
(19, 10, '2026-02-04', 'Had a good time and interactive session with the teammates and also i enjoyed with my friends and juniors.', 'shubham was laughed finally!! i hope he is happy.', 'Being friendly and supportive for each and every person and maintaining my consistency\r\n', 'The projects which we are working on will definitely make some big sense in the market on Future.', '2026-02-04 14:19:36', '2026-02-04 14:19:36'),
(20, 1, '2026-02-05', 'Went for shopping and came out without spending single penny', 'My mother must be proud of me as i didnt spent money on waste things', 'To own a car which i saw today', 'SERPHawk can make true my dream of getting good launch of my career', '2026-02-05 13:30:00', '2026-02-05 13:30:00'),
(21, 11, '2026-02-05', 'Happy because team understand and supported me while my device is not working ', 'My sister is happy bcz i bought her pastries ', '', '', '2026-02-05 13:59:51', '2026-02-05 13:59:51'),
(22, 16, '2026-02-05', 'Felt happy receiving the Kotak811 Metal Card', 'Had a chat with my friend and she was happy about that', 'Didn\'t stop learning something everyday', '', '2026-02-05 14:13:55', '2026-02-05 14:15:30'),
(23, 14, '2026-02-05', 'Today I felt happy because I started thinking about how to solve real-life problems in digital ways.', 'My in-laws are happy today because they get to spend more time with their granddaughter since I got this internship and came to my native place with my child.', 'My goal is to create a meaningful digital solution for a particular problem or need.', 'By helping me build confidence and gain the skills needed to think and work like a real programmer.', '2026-02-05 14:14:06', '2026-02-05 14:14:06'),
(24, 15, '2026-02-05', 'Met the childhood friend', 'It\'s election time in our city spoken with the candidate about the development which he did he felt happy.', 'motivating myself everytime', '', '2026-02-05 14:19:52', '2026-02-05 14:19:52'),
(25, 17, '2026-02-05', 'I got a new kettle and today, i made my first coffee with it ! made me happy.', 'Giving a gift to my friend,....', 'Self satisfaction  ,Better living condition,Growth,etc..', '', '2026-02-05 15:02:18', '2026-02-05 15:02:18'),
(26, 18, '2026-02-05', 'went out bowling', 'celebrated our friends birthday', 'need to more productive', '', '2026-02-05 16:48:42', '2026-02-05 16:48:42'),
(27, 10, '2026-02-05', 'Finally completed my examss!!', 'my friend is happy because I brought her favourite icecream', 'I Need to improve my testing skills.\r\n', '', '2026-02-05 17:10:27', '2026-02-05 17:10:27'),
(28, 20, '2026-02-05', 'I have connected with some new person who is actually working on some IT field.', 'He is happy too see my project and idea what I have regrading my work.', 'I believe that wherever I work, I will approach my responsibilities with full seriousness and dedication.', 'Explore the new project and enhance the new features in current ongoing project too.', '2026-02-05 17:36:58', '2026-02-05 17:36:58'),
(29, 21, '2026-02-05', 'i helped my juniors for hosting event', 'he is happy to get work easier.', 'going to gym daily from tomorrow.', '', '2026-02-05 18:06:24', '2026-02-05 18:06:24'),
(30, 11, '2026-02-06', 'happy bcz my device got repaired', 'iur neighbour child was happy bcz i give her a chocolate', '', '', '2026-02-06 12:37:08', '2026-02-06 12:37:08'),
(31, 18, '2026-02-06', 'i was able to finish the email agent pretty quick then i expected', 'i helped my mom with small chores which made her day easier', 'need to be focus oriented', '', '2026-02-06 12:39:27', '2026-02-06 12:39:27'),
(32, 1, '2026-02-06', 'Im happy with the interaction happned today with the team, varsha\'s prank , syama singing and vijay\'s guitar play.', 'Everyone in the team enjoyed the session', 'Worklife balance', '', '2026-02-06 12:52:31', '2026-02-06 13:40:23'),
(33, 14, '2026-02-06', 'Iâ€™m happy because my sister-in-law gave me a lovely gift', 'I had a good conversation with my in-laws and made them happy.', 'I want to be successful in my career.\r\n', '', '2026-02-06 13:07:46', '2026-02-06 13:07:46'),
(34, 16, '2026-02-06', 'The curry which I\'ve cooked today turned out delicious! ', 'Mom felt happy because I cooked lunch for her today! ', 'NLP in progress', '', '2026-02-06 13:08:35', '2026-02-06 13:08:35'),
(35, 15, '2026-02-06', 'Varsha\'s prank made me laugh.', 'Its my friend birthday i gifted him a Cap he felt happy', 'Aim for the stars atleast we can reach the trees top', '', '2026-02-06 14:05:07', '2026-02-06 14:05:07'),
(36, 10, '2026-02-06', 'I had a memorable session with the team today, where we have shared some things and varsha\'s singing and prank, Syama\'s singing and Vijay\'s music was highlighting and had interactive session.', 'i hope team will be happy because of my support and interaction', 'we have to provide some funny,career guidance,interactive ,debate and mentor sessions for the team and with the teammates', '', '2026-02-06 14:39:35', '2026-02-06 14:39:35'),
(37, 17, '2026-02-06', 'Listened to a nice song that make happy .', 'Session held within the company was informative and made me feel happy.', 'I focus on achieving my goals while staying self-satisfied and avoiding greed, valuing balance and inner peace over excess.', '', '2026-02-06 16:27:09', '2026-02-06 16:27:09'),
(38, 11, '2026-02-07', 'I fed my brother in law carrot pudding mixed with pickle did a little prank and we laughed then', 'I helped my sister to pick a gift for my brother in law ', '', '', '2026-02-07 11:37:58', '2026-02-07 11:37:58'),
(39, 16, '2026-02-07', 'Eating my favourite biscuits - Biscoff! ', 'Helped my mom in household chores', '', '', '2026-02-07 11:42:16', '2026-02-07 11:42:16'),
(40, 15, '2026-02-07', 'First time felt happy that i prepared the Badam milk shake.', 'My family members felt happy by drinking that shake.', 'Life is like an outlier no model can fix it.', '', '2026-02-07 11:44:43', '2026-02-07 11:44:43'),
(41, 14, '2026-02-07', 'I am happy to enter another weekend with my family.', 'They are happy to be with me too.', 'Put efforts to learn new things', '', '2026-02-07 11:49:51', '2026-02-07 11:49:51'),
(42, 17, '2026-02-07', 'Enjoying  the weekend and felt relaxed and refreshed.', 'I enjoyed the weekend and felt relaxed and refreshed with my friend at home.', 'Avoid unnecessary stress.', '', '2026-02-07 11:56:33', '2026-02-07 11:56:33'),
(43, 1, '2026-02-07', 'All the interns appealed for saturday weekoff and anjali has given word that if we complete then she will take responsiblty to doo it', 'everyone are happy hearing that from anjali', 'To complete projects by feb 15', '', '2026-02-07 12:03:35', '2026-02-07 12:03:35'),
(44, 21, '2026-02-07', 'All the interns requested a Saturday week off, and Anjali gave her word that if we complete the work, she will take responsibility for it.', 'anjali sister made happy by speaking those words', '', '', '2026-02-07 12:09:44', '2026-02-07 12:09:44'),
(45, 11, '2026-02-08', 'Happy bcz we are out whole family together ', 'My aunty is happy bcz i met her', '', '', '2026-02-08 11:47:24', '2026-02-08 11:47:24'),
(46, 1, '2026-02-08', 'Happy to write my GATE exam. Felt like a korean movie without subtitles', 'Organizers must be happy by giving this kind of paper', 'To crack into IIT', '', '2026-02-08 15:11:25', '2026-02-08 15:11:25'),
(47, 16, '2026-02-08', 'Reading Varshith\'s GATE exam experience made me laugh', '', '', '', '2026-02-08 16:27:00', '2026-02-08 16:27:00'),
(48, 10, '2026-02-08', 'I have made Chicken fry it turned out nice and got compliments from my cousins and my sister-in-law made me happy by giving gifts for me.\r\n', 'My cousins were happy because of my chicken recipe and my sister-in-law is happy because we made a reel and she got some gifts from me', 'Need to spend spend some time with family', '', '2026-02-08 17:17:54', '2026-02-08 17:26:49'),
(49, 18, '2026-02-09', 'went out to shopping', 'gave a advice to my parents', 'need to lock in', '', '2026-02-09 05:33:29', '2026-02-09 05:33:29'),
(50, 14, '2026-02-09', 'Today made me happy because my child cooperated with me even though there was no one else to manage her, and she didnâ€™t disturb my work.', 'My mother is also happy to see that I can manage my child by myself', '', '', '2026-02-09 05:34:57', '2026-02-09 12:49:45'),
(51, 15, '2026-02-09', 'My friend selected as an Assistant Director felt very happy', 'I helped my friend and given insights regarding the conversation with the director.', '', '', '2026-02-09 05:36:31', '2026-02-09 12:38:24'),
(52, 21, '2026-02-09', 'Went to the gym.', 'My friend are happy seeing in the gym.', '', '', '2026-02-09 05:39:14', '2026-02-09 05:39:14'),
(53, 17, '2026-02-09', 'I am getting into new project.', 'Project kickoff happiness', 'Going for excersise', '', '2026-02-09 06:06:09', '2026-02-09 13:03:00'),
(54, 11, '2026-02-09', 'planned surprise for mothers birthday', 'my sister is happy bcz i agreed for outing with her', '', '', '2026-02-09 12:07:56', '2026-02-09 12:07:56'),
(55, 1, '2026-02-09', 'happy to eat dosa ', 'helped my sister mobile to charge when she is wokring, ', 'doing small social helps like this everyday', '', '2026-02-09 12:38:20', '2026-02-09 12:38:20'),
(56, 16, '2026-02-09', 'Got my passport!!!!', 'Sent money for my brother, he was happyyy!', '', '', '2026-02-09 12:45:39', '2026-02-09 12:45:39'),
(57, 11, '2026-02-10', 'happy bcz i had one of my favourite food today ', 'my friend was happy bcz she liked her gift which i gifted her', '', '', '2026-02-10 12:23:05', '2026-02-10 12:23:05'),
(58, 15, '2026-02-10', 'I got struck in my project the support and push given by Anjali and Varshith made me feel happy.', 'I scored 90 percent in one of the college placement examination my parents felt happy.', '', '', '2026-02-10 12:29:49', '2026-02-10 12:29:49'),
(59, 14, '2026-02-10', 'I am happy because I got a chance to see my sister and her child again, as I think this may be the last time before I return to Bangalore.', 'My sister is also happy to meet me', '', '', '2026-02-10 12:44:12', '2026-02-10 12:44:12'),
(60, 16, '2026-02-10', 'My friend got Chicken Pickle!!!!', 'Came to Hyderabad. My friends are happy for my arrival.', '', '', '2026-02-10 12:47:17', '2026-02-10 12:47:17'),
(61, 1, '2026-02-10', 'got my first full paid stipend', 'my sister will be happy more than me', '', '', '2026-02-10 12:49:08', '2026-02-10 12:49:08'),
(62, 21, '2026-02-10', 'working too much and being most productive today', 'my brain is happy that i worked more than normal.', '', '', '2026-02-10 12:49:23', '2026-02-10 12:49:23'),
(63, 10, '2026-02-09', 'Lakshmi sis from Ally tech has given me a gift which she brought it from her recent trip. and my Bestfriend gave me my fav Chocolate', 'I hope Lakshmi sis is very happy to see me back in Office.', 'we need to finish the basic versions of all projects to be deployed within 15th feb.', '', '2026-02-10 14:57:35', '2026-02-10 14:57:35'),
(64, 10, '2026-02-10', 'My grand pa was sharing me about our crop, home, chickens, and about my cousins etc....listening to those made me very happy and by seeing his health improvements I\'m so relaxed.', 'My grandparents were happy because I have confirmed them about going to my village next month.', 'I want to be available and spend more time for my grandparents and my Family whenever they need me or misses me.', '', '2026-02-10 15:25:35', '2026-02-10 15:25:35'),
(65, 18, '2026-02-10', 'went to dlf street to have food', 'me and my friend met after a long time ', '', '', '2026-02-10 15:30:33', '2026-02-10 15:30:33'),
(66, 17, '2026-02-10', 'I went to the temple this evening,i\'m feeling recharged.', 'Happy with my friend in my home, she is so supportive and brightens my day.', 'set up tracking system.', '', '2026-02-10 15:52:34', '2026-02-10 15:52:34'),
(67, 1, '2026-02-11', 'happy that im able to change my mobile adapter , my stipend had gone in oneday', 'me and my friend had a good time at video games', 'I want to be greedy ', '', '2026-02-11 13:36:41', '2026-02-11 13:36:41'),
(68, 15, '2026-02-11', 'Felt happy the my brother-in-law marraige is fixed.', 'I buyed choclates for my brothers child he felt happy', 'Work hard anyhow once you step in.', '', '2026-02-11 13:37:44', '2026-02-11 13:37:44'),
(69, 18, '2026-02-11', 'made lunch myself', 'i had no human interaction today yet ', '', '', '2026-02-11 13:42:47', '2026-02-11 13:42:47'),
(70, 14, '2026-02-11', 'I was happy to know that my presence made my mother happy too.', 'My child feels very happy when traveling with me on the scooter, standing in front.', '', '', '2026-02-11 13:43:39', '2026-02-11 13:43:39'),
(71, 11, '2026-02-11', 'while working when i was little bored and tired my friend helped me suggested me somethings and he talked to me and after i feel freshed', 'my mother liked the surprise of family get togather on her birthday ', '', '', '2026-02-11 13:45:42', '2026-02-11 13:45:42'),
(72, 16, '2026-02-11', 'I\'ll get free attendance in college from today!! (Got permission from DEAN showing this internship letter)', 'Today I cooked Mushroom Curry and my friend\'s friend loved it so much she couldn\'t stop eating! She used to hate mushrooms, but now sheâ€™s officially a fan!!', '', '', '2026-02-11 13:47:56', '2026-02-11 13:47:56'),
(73, 17, '2026-02-11', 'Saving money and staying under budget.', 'i am planning to prepare some food with someone.', 'Focussing on career.', '', '2026-02-11 13:49:35', '2026-02-11 13:49:35'),
(74, 21, '2026-02-11', ' came to my grandma home to cast my vote.', 'fighting with my brother he is happy with that.', '', '', '2026-02-11 13:54:45', '2026-02-11 13:54:45'),
(75, 18, '2026-02-12', 'i have finished suits season 5', 'went out with my mom\'s brother', '', '', '2026-02-12 12:54:03', '2026-02-12 12:54:03'),
(76, 15, '2026-02-12', 'Felt happy my sister became the Certified Medical Coder.', 'The same thing made the whole family happy', '', '', '2026-02-12 13:00:59', '2026-02-12 13:00:59'),
(77, 1, '2026-02-12', 'Watched a new thriller that hold my suspense after long time', 'i deployed crm project, maybe anjali and brajesh will be happy by the first cut', '', '', '2026-02-12 13:06:20', '2026-02-12 13:06:20'),
(78, 11, '2026-02-12', 'happy bcz i was able to help rinu sis to deploy her website and also for anjali and rinu sis complemented me', 'Rinu sis was happy bcz i helped her', '', '', '2026-02-12 13:10:51', '2026-02-12 13:10:51'),
(79, 14, '2026-02-12', 'Iâ€™m happy to see my job portal live and also happy for the effort Kruthi has put into it.', 'I think Kruthi is also happy about the job portal deployment', '', '', '2026-02-12 13:24:01', '2026-02-12 13:24:01'),
(80, 21, '2026-02-12', 'i spend time with my sister.', 'she is happy i brought her home.', '', '', '2026-02-12 13:27:36', '2026-02-12 13:27:36'),
(81, 16, '2026-02-12', 'Drank my favourite drink - Mogu Mogu ', 'Cooked for my friend. She felt genuinely happy!', '', '', '2026-02-12 14:09:01', '2026-02-12 14:09:01'),
(82, 10, '2026-02-12', 'motivated myself and spent some time on myself after a long time. and one of my childhood friend called me suddenly and we had some fun talk.', 'I think she is happy because i said her that i will be meeting her when i go back to my village.', 'need to give time for myself and prioritising the things which makes me happy', '', '2026-02-12 15:23:35', '2026-02-12 15:23:35'),
(83, 17, '2026-02-12', 'Thrilled to be joining Serp Hawk  hosting and Web miles. ', 'I love my local tea shopâ€”great food, better company, and they always make me feel extra welcome.', '', '', '2026-02-12 17:38:25', '2026-02-12 17:38:25'),
(84, 14, '2026-02-13', 'I am happy because we have a get-together at my brother-in-lawâ€™s house tonight', 'Sharing my childâ€™s little laughing talks with her grandparents made them happy', '', '', '2026-02-13 12:36:28', '2026-02-13 12:36:28'),
(85, 1, '2026-02-13', 'planned for a small road trip with friends', 'my friends are happy that we planned and make it done after long time', 'To have more and more trips with my buddies', '', '2026-02-13 13:20:34', '2026-02-13 13:20:34'),
(86, 15, '2026-02-13', 'Our Uncle elected as a Muncipal Chairperson.', 'I have tried the beetroot and banana juice its fantastic my family tasted it and felt happy.', '', '', '2026-02-13 13:27:43', '2026-02-13 13:27:43'),
(87, 11, '2026-02-13', 'have a good and long chat with my friend', 'my sister is happy bcz i paid for her dress', '', '', '2026-02-13 13:44:35', '2026-02-13 13:44:35'),
(88, 21, '2026-02-13', 'i am happy that i deployed the project.', 'had a nice talk with my friends they are happy to talk to me.', '', '', '2026-02-13 13:45:19', '2026-02-13 13:45:19'),
(89, 17, '2026-02-13', 'Having the good with house. ', 'Buy some gift for my favorite people!', '', '', '2026-02-13 19:08:56', '2026-02-13 19:08:56'),
(90, 14, '2026-02-14', 'Today I am happy because we are going to celebrate my cousinâ€™s engagement tonight.', 'My family is happy because we had a nice talk with them', '', '', '2026-02-14 10:56:57', '2026-02-14 10:56:57'),
(91, 11, '2026-02-14', 'happy bcz my sisiter marriage date got fixed', 'my school teacher was happy talking me', '', '', '2026-02-14 11:34:43', '2026-02-14 11:34:43'),
(92, 16, '2026-02-14', 'My mom bought me dresses, yayyy!!!', 'I bought my cousin a chocolate mousse. He\'s happy for that.', '', '', '2026-02-14 11:58:05', '2026-02-14 11:58:20'),
(93, 15, '2026-02-14', 'My childhood friend came from the America and spoke with him.', 'By seeing me he felt happy.', '', '', '2026-02-14 12:26:34', '2026-02-14 12:26:34'),
(94, 21, '2026-02-14', 'today i played some games with my friends.', 'they are bot in games that made others happy', '', '', '2026-02-14 14:27:04', '2026-02-14 14:27:04'),
(95, 18, '2026-02-14', 'went to dhaba with my friends ', 'my friend in gym hit full stack with my motivation ðŸ˜‚', '', '', '2026-02-14 14:58:45', '2026-02-14 14:58:45'),
(96, 10, '2026-02-14', 'My mom made me my fav dinner and my brother surprised me with a chocolate.', 'My Parents are happy to see me back!!', '', 'trying to deploy Job portal within by 20th feb', '2026-02-14 17:49:58', '2026-02-14 17:49:58'),
(97, 1, '2026-02-14', 'Im happy that ive met my grandma after long time and also my friends had started for the trip', 'My family is happy for this', '', '', '2026-02-14 17:57:43', '2026-02-14 17:57:43'),
(98, 17, '2026-02-15', 'Today, we celebrated Navratri with worship and celebrations, enjoying good food together. ', 'I had a happy Sunday relaxing at home with others. ', '', '', '2026-02-15 07:05:42', '2026-02-15 16:43:01'),
(99, 11, '2026-02-15', 'Visited temple today', 'Our neighbour child is happy bcz i played with her', '', '', '2026-02-15 13:19:03', '2026-02-15 13:19:03'),
(100, 18, '2026-02-15', 'visited my grandparents today', 'i met some villagers and have spend some time with them', '', '', '2026-02-15 13:32:31', '2026-02-15 13:32:31'),
(101, 10, '2026-02-15', 'Went to the temple with my mom and our relatives, had a good time with my Family. Met my sister after 3 years and she brought me a gifts and lot of chocolates from US.', 'My Sister was so happy to meet me and she loved the roses!!', '', '', '2026-02-15 18:17:05', '2026-02-15 18:17:05'),
(102, 14, '2026-02-15', 'Today, I am happy because we returned to Bangalore after one month.', 'My husband is also happy that I am joining him on the return trip to Bangalore', '', '', '2026-02-16 03:32:30', '2026-02-16 03:32:30'),
(103, 16, '2026-02-15', 'Fasted for 20 hourssss!', 'Met my friend, she\'s happy to see me!', '', '', '2026-02-16 05:13:56', '2026-02-16 05:13:56'),
(104, 1, '2026-02-15', 'Done with my GATE exam, hoping to get seat at IIT proddatur', 'Met my friends and we all are happy', '', '', '2026-02-16 05:14:13', '2026-02-16 05:14:13'),
(105, 15, '2026-02-15', 'The Mahashivratri Festival the Bajans and the devotional songs.', 'the festival vibes in the home made all the family members happy', '', '', '2026-02-16 05:15:44', '2026-02-16 05:15:44'),
(106, 21, '2026-02-15', 'watching ind vs pak match.  watching sadhguru live stream all night.', 'chilling with my friend they are happy.', '', '', '2026-02-16 05:30:15', '2026-02-16 05:30:15'),
(107, 18, '2026-02-16', 'i hit my goal of sitting and working 7 hrs straight ', 'my uncle had lunch with me and it was a good experince', '', '', '2026-02-16 12:01:47', '2026-02-16 12:01:47'),
(108, 15, '2026-02-16', 'Felt Happy today is my parents Wedding Anniversary.', 'Gifted the special thing to my parents.', '', '', '2026-02-16 12:15:34', '2026-02-16 12:15:34'),
(109, 1, '2026-02-16', 'Im happy to know that me and my frnds will be going to tirupati this weekend', 'My friends are all happy knowing will be on trip after long time', 'To complete the plans safe and secure', 'SERPHawk can make this thing true by giving me paid leave', '2026-02-16 12:21:14', '2026-02-16 12:21:14'),
(110, 16, '2026-02-16', 'Again lunch recipe was a hit! Mushroom rice!!', 'My friend got happy tears eating the food!', '', '', '2026-02-16 12:28:31', '2026-02-16 12:28:31'),
(111, 11, '2026-02-16', 'i met my little cousin sister', 'my mama was happy meeting me', '', '', '2026-02-16 12:54:16', '2026-02-16 12:54:16'),
(112, 14, '2026-02-16', 'I am happy to see my child thrilled about her school, even though she hasnâ€™t started yet.', 'My husband is happy managing our child since I gave him the chance to take care of her for the whole day.', '', '', '2026-02-16 13:03:09', '2026-02-16 13:03:09'),
(113, 10, '2026-02-16', 'Finished 1st cut of testing within 3 hours for a simple project which i have discussed with Pavan Bro and Gaurav sir and i was getting accurate results.', 'I hope Pavan bro will be happy for that progress', '', '', '2026-02-16 13:05:09', '2026-02-16 13:06:42'),
(114, 21, '2026-02-16', 'Had a good nap after long time.', 'Cooked potato curry for my friends and they are happy eating it.', '', '', '2026-02-16 16:02:20', '2026-02-16 16:02:20'),
(115, 17, '2026-02-17', 'I got a  pizza today, and I\'m happy!', 'I shared the pizza with someone.', '', '', '2026-02-17 03:04:57', '2026-02-17 17:21:56'),
(116, 11, '2026-02-17', 'happy to talk to my brother in law he called , he is like an elder brother for me always caring and loving', 'my brother in law was also happy to talk to me after days', '', '', '2026-02-17 12:07:01', '2026-02-17 12:07:01'),
(117, 15, '2026-02-17', 'My friend got placed with good package that made me happy', 'I helped my sister in her project she felt happy', '', '', '2026-02-17 12:12:03', '2026-02-17 12:12:03'),
(118, 14, '2026-02-17', 'I am happy because my daughter in her first day of day care behaved more pleasant', 'My daughter and husband are happily watching a movie without me', '', '', '2026-02-17 12:19:30', '2026-02-17 12:19:30'),
(119, 21, '2026-02-17', 'i am so happy that my team gave me a suprise.the best birthday ever.', 'together with my friends made them happy.', '', '', '2026-02-18 04:25:47', '2026-02-18 04:25:47'),
(120, 11, '2026-02-18', 'happy bcz i m gonna cook myself dinner', 'my sister is happy bcz i m including her in cooking part', '', '', '2026-02-18 12:28:53', '2026-02-18 12:28:53'),
(121, 14, '2026-02-18', 'I am happy because my child finished all the snacks I prepared for her at daycare today.', 'My child is also happy to have the snacks.', '', '', '2026-02-18 12:34:22', '2026-02-18 12:34:22'),
(122, 1, '2026-02-18', 'Met my friend yesterday and had some good time', 'I gifted my friend sneakers and he was so happy', 'to get return gift from him', '', '2026-02-18 12:45:56', '2026-02-18 12:45:56'),
(123, 1, '2026-02-17', 'i met vijay and my other friend after long time and had a dinner with both of them', 'vijay was so excited and happy seeing both of us', '', '', '2026-02-18 12:48:19', '2026-02-18 12:48:19'),
(124, 21, '2026-02-18', 'my happy after long time i could watch some webseries.', 'i cooked some food for my friends and they are happy for it.', '', '', '2026-02-18 12:49:01', '2026-02-18 12:49:01'),
(125, 10, '2026-02-17', 'i was by seeing my team\'s unity and progress day by day....and giving surprise to vijay i felt happy', 'i hope brajesh sir happy to see the progress and interns are happy to hear the the positive feedback from him and i hope team mem including vijay are happy for his b\'day surprise', '', '', '2026-02-18 12:49:35', '2026-02-18 12:49:35'),
(126, 10, '2026-02-18', 'I have slept for 5hrs continuously and had a good rest for myself ', 'My friend is happy because i\'ll be writing her assignment .', '', '', '2026-02-18 12:51:52', '2026-02-18 12:51:52'),
(127, 17, '2026-02-18', 'I received an unexpected call. ', 'I Cleaning the house made all very happy. ', '', '', '2026-02-18 12:53:32', '2026-02-18 12:53:32'),
(128, 16, '2026-02-18', 'Spoke with brother for 1 hour ', '', '', '', '2026-02-18 15:05:37', '2026-02-18 15:05:37'),
(129, 1, '2026-02-19', 'Had a good flavoured maggi today', 'My sister is happy as i reassured her', 'to learn and to eat same kind forrever', '', '2026-02-19 12:27:08', '2026-02-19 12:27:08'),
(130, 14, '2026-02-19', 'Today, I am happy because my previous colleague is sharing some new technologies with me.', 'My husband is happy with the dishes I made today.', '', '', '2026-02-19 12:30:43', '2026-02-19 12:30:43'),
(131, 11, '2026-02-19', 'happy bcz i got flowers from my father', 'my father was happy bcz i done his car assurance online only', '', '', '2026-02-19 12:35:46', '2026-02-19 12:35:46'),
(132, 17, '2026-02-19', 'One of my friend reaching out to chat.', 'We are happy as we reconnecting after a long time.\r\n\r\n', '', '', '2026-02-19 12:40:00', '2026-02-19 12:40:00'),
(133, 15, '2026-02-18', 'Felt happy because a good carrer conversation happend with my firend.', 'The words of mine motivated my friend he felt happy', '', '', '2026-02-19 12:59:48', '2026-02-19 12:59:48'),
(134, 15, '2026-02-19', 'I have completed my course examination', 'My parents were happy that i have written exam well.', '', '', '2026-02-19 13:04:24', '2026-02-19 13:04:24'),
(135, 16, '2026-02-19', 'Our 2nd review was sooo smoootthhhhhh!', 'Cooked for my friend. She was happyyy for that ', '', '', '2026-02-19 18:24:44', '2026-02-19 18:24:44'),
(136, 18, '2026-02-19', 'i had good time connecting with everyone', 'we had good bonding session ', '', '', '2026-02-20 05:13:34', '2026-02-20 05:13:34'),
(137, 8, '2026-02-20', 'everyone in the team is more responsible for their work today.', '', 'i will find ways for people to be healthy.', 'i will be a pilot some day.', '2026-02-20 11:14:42', '2026-02-20 11:14:42'),
(138, 21, '2026-02-19', 'the yesterday meet made my day.', 'my friend got a good appreciation because of me.', '', '', '2026-02-20 12:17:47', '2026-02-20 12:17:47'),
(139, 14, '2026-02-20', 'I am happy because my husband came home early today after work.', 'My child is happy with the breakfast I made this morning.', '', '', '2026-02-20 13:23:15', '2026-02-20 13:23:15'),
(140, 18, '2026-02-20', 'i\'m glad that i met vijay ', 'i complimented my mom for the food she made', '', '', '2026-02-20 13:23:23', '2026-02-20 13:23:23'),
(141, 15, '2026-02-20', 'I felt happy by the complement given by Brajesh Sir ( Varun you are looking like Shahrukh khan)', 'I ordered my friend a Biryani he felt happy.', '', '', '2026-02-20 13:23:47', '2026-02-20 13:23:47'),
(142, 16, '2026-02-20', 'Got compliments from my friends for my lunch recipe todayyy!!', 'They were happy for eating good food!', '', '', '2026-02-20 13:25:23', '2026-02-20 13:25:23'),
(143, 11, '2026-02-20', 'happy bcz my sister has got good result', 'my sister is happy bcz now i m taking her out', '', '', '2026-02-20 13:25:36', '2026-02-20 13:25:36'),
(144, 21, '2026-02-20', 'happy to see our founder gaurav sir.', 'my friend is happy seeing me.', '', '', '2026-02-20 13:28:54', '2026-02-20 13:28:54'),
(145, 8, '2026-02-21', 'i can see we are able to make the world a better place by making what we dream of and by dreaming things which our parents thought impossible', 'the belief of \"i can achieve anything that i set my goals on\" in my team', 'i will be an aeroplane pilot\r\nwe will help 100 enterpreneurs make their dreams true by end of this year', 'we will have a gaurav chatbot to help teach excel  with audio , app, offline \r\nwe will have a healthbot with knowledge of many nutritionists chatbot with audio , app, offline \r\nwe will have a \"recruiter\"bot with knowledge of the \"recruiter\" chatbot with audio , app, offline \r\nour team will learn 1 new skill and teach in this team \r\nour team will visit iim , iit once every month in groups of 2 or more and spend 1 full day there speaking about their products\r\nour team will connect with a few startup founders , venture capitalists and explain their products atleast once a week in linkedin\r\nour team will understand agritech and talk to some agritech companies to what problem they are solving and what it takes for them to reach next 100 farmers\r\nwe will have a \"farming\" bot with knowledge of many agritech chatbot with audio , app, offline', '2026-02-21 02:31:34', '2026-02-21 02:31:34'),
(146, 14, '2026-02-21', 'Today, I am happy because I was able to manage the situation better than before', 'My child was happy to spend the entire day with me', '', '', '2026-02-21 11:42:56', '2026-02-21 11:42:56'),
(147, 15, '2026-02-21', 'Felt happy that my sister cleared the interview', 'Team coordination and solving the issues of project.', 'Iterative Learning and consistency towards the subject.', '', '2026-02-21 11:46:14', '2026-02-21 11:46:14'),
(148, 11, '2026-02-21', 'happy bcz going out today with my sister and brother in law', 'my sister is happy bcz i went to pick her up and she dont have to come home on her own', '', '', '2026-02-21 11:51:43', '2026-02-21 11:51:43'),
(149, 16, '2026-02-21', 'Received my AJIO order!', 'I said I\'ll be cooking dinner, my friend felt happy that she don\'t have work to do! ', '', '', '2026-02-21 11:55:16', '2026-02-21 11:55:16'),
(150, 10, '2026-02-21', 'Happy that Our First post on HireMatrix got one enquiry and happy to motivate my team', 'I hope team members are happy because of my motivation.', '', '', '2026-02-21 12:22:26', '2026-02-21 12:22:26'),
(151, 10, '2026-02-22', 'I have completed one entire series after so many months', 'i gave given a ice-cream for a kid who stays near our place, I hope she is happy.', '', '', '2026-02-22 17:38:12', '2026-02-22 17:38:12'),
(152, 21, '2026-02-21', 'Not so happy because my laptop got some problems', 'My mom is happy that I got my head out the laptop ', '', '', '2026-02-22 17:40:32', '2026-02-22 17:40:32'),
(153, 21, '2026-02-22', 'I made some food for my friends', 'My friends are happy having me in their room\r\n', '', '', '2026-02-22 17:42:12', '2026-02-22 17:42:12'),
(154, 11, '2026-02-22', 'Happy bcz today i gone to game zone and movie and dinner with cousins ', 'My cousin was happy bcz i did her makeup ', '', '', '2026-02-22 17:42:47', '2026-02-22 17:42:47'),
(155, 16, '2026-02-22', 'Went for shopping, brought new outfits! Ate Chicken Biryani that tasted too gooood!', 'Complimented on the food I ate at a cafe, the owner felt happyyy! ft.Robusta, Chanda Nagar', '', '', '2026-02-22 18:02:54', '2026-02-22 18:02:54'),
(156, 14, '2026-02-22', 'Iâ€™m happy today because itâ€™s the weekend and my family is with me', 'My daughter received good care from me while she was ill.', '', '', '2026-02-22 18:04:13', '2026-02-22 18:04:13'),
(157, 15, '2026-02-22', 'Iam Happy because my friend ordered me a Biryani.', 'My cousins felt happy talking to me.', '', '', '2026-02-23 04:58:43', '2026-02-23 04:58:43'),
(158, 15, '2026-02-23', 'happy because my uncle is returned to India from Abudhabi.', 'spoke with the uncle he felt happy.', '', '', '2026-02-23 12:41:57', '2026-02-23 12:41:57'),
(159, 14, '2026-02-23', 'I am happy because I feel I have recovered from the fever.', 'My daughter is happy with her favourite dish that I made.', '', '', '2026-02-23 12:55:20', '2026-02-23 12:55:20'),
(160, 10, '2026-02-23', 'Happy to register for Certiport exam.', 'My Freind was Happy because i said that i will be meeting her soon.', '', '', '2026-02-23 13:07:08', '2026-02-23 13:07:08'),
(161, 11, '2026-02-23', 'happy to complete my work target', 'happy to talk to my cousin in canada', '', '', '2026-02-23 13:07:10', '2026-02-23 13:07:10'),
(162, 18, '2026-02-23', 'i watched a gran turismo', 'friends video call', '', '', '2026-02-24 03:50:48', '2026-02-24 03:50:48'),
(163, 1, '2026-02-24', 'Happy to be back to the team', 'team will be happy with my comeback', 'to get into IIT with the hardware product', 'Providing me the guidance,  components and money to get there', '2026-02-24 12:48:09', '2026-02-24 12:48:09'),
(164, 15, '2026-02-24', 'I felt happy that i had my favourite food for the lunch after long time.', 'i sent application links for my friend in their domain , so he felt happy.', '', '', '2026-02-24 12:48:20', '2026-02-24 12:48:20'),
(165, 18, '2026-02-24', 'i\'m happy that akka got ai pro version of anti gravity', 'akka got ai pro version of anti gravity', '', '', '2026-02-24 12:50:14', '2026-02-24 12:50:14'),
(166, 11, '2026-02-24', 'i m happy too get my parcel', 'my papa was happy bcz i helped him in his work', '', '', '2026-02-24 12:51:32', '2026-02-24 12:51:32'),
(167, 16, '2026-02-24', 'Met my friends in the college ', 'The lab incharge seemed happy upon hearing our mentor scold us ', '', '', '2026-02-24 12:51:46', '2026-02-24 12:51:46'),
(168, 21, '2026-02-24', 'happy seeing my childhood friend is getting married.', 'they are happy talking to them.', '', '', '2026-02-24 12:53:38', '2026-02-24 12:53:38'),
(169, 14, '2026-02-24', 'I am happy because I am enjoying the bonding between me and my daughter.', 'I am behaving in a way that my family members expect', '', '', '2026-02-24 12:55:10', '2026-02-24 12:55:10'),
(170, 10, '2026-02-24', 'My uncle ordered food for me on account of their Marriage anniversary.', 'My aunt and uncle were happy because i wished them and my sisters were happy to because i liked the cake which i ordered for them.', 'releasing first version of Job portal by end of this month.', '', '2026-02-24 17:15:12', '2026-02-24 17:15:12'),
(171, 14, '2026-02-25', 'I am happy because my husband helped me with preparing the food.', 'By preparing food according to my family membersâ€™ preferences', '', '', '2026-02-25 12:48:42', '2026-02-25 12:48:42'),
(172, 18, '2026-02-25', 'i ate garlic naan and butter chicken with my friend', 'i bought my friend an ice cream\r\n', '', '', '2026-02-25 12:50:05', '2026-02-25 12:50:05'),
(173, 15, '2026-02-25', 'happy because we are going to publish a research paper of our project.', 'My team mates felt happy that i took initiative for the publish of reasearch paper.', '', '', '2026-02-25 12:50:33', '2026-02-25 12:50:33'),
(174, 11, '2026-02-25', 'happy to complete my work target', 'my grandmother is happy bcz i cooked for her', '', '', '2026-02-25 12:53:13', '2026-02-25 12:53:13'),
(175, 16, '2026-02-25', 'I cooked lunch in a short span of time without compromising taste!!', 'My friend realising my worth', '', '', '2026-02-25 12:53:56', '2026-02-25 12:53:56'),
(176, 1, '2026-02-25', 'happy to go to clg and had a talk with my friends', 'my friends were happy after meeting', 'to complete my final year ', '', '2026-02-25 12:53:57', '2026-02-25 12:53:57'),
(177, 21, '2026-02-25', 'got my eye check up. now i am free from burning eyes', 'i got my sister biryani and she is happy for that.', '', '', '2026-02-25 12:54:35', '2026-02-25 12:54:35'),
(178, 10, '2026-02-25', 'My friend surprised me with my favourite juice and chocolate', 'She was happy seeing my excitement and happiness, and she felt very satisfied because I massaged her head.', 'maintaining the same consistency in all the things. ', '', '2026-02-25 16:31:12', '2026-02-25 16:31:12'),
(179, 1, '2026-02-26', 'im happy today to see the shortlisting candidates of the drive', 'all my friends happy after seeing that sheets', 'to crack 14LPA', '', '2026-02-26 12:33:22', '2026-02-26 12:33:22'),
(180, 15, '2026-02-26', 'Met my college friends after long time.', 'our project guide felt happy that our team completed half of the project.', '', '', '2026-02-26 12:33:47', '2026-02-26 12:33:47'),
(181, 18, '2026-02-26', 'i had many chocolate', 'i got my friend badam milk', '', '', '2026-02-26 12:34:14', '2026-02-26 12:34:14'),
(182, 11, '2026-02-26', 'i had my favourite flavoured ice creams', 'my parents are happy bcz i agreed to go on family get togather', '', '', '2026-02-26 12:35:11', '2026-02-26 12:35:11'),
(183, 21, '2026-02-26', 'my childhood friend got married i am happy for her', 'My friends organized a nice meetup there, and we all had a great chat.', '', '', '2026-02-26 12:35:11', '2026-02-26 12:35:11'),
(184, 14, '2026-02-26', 'I am happy that I am still learning.', 'Saying thanks to others from the heart.', '', '', '2026-02-26 12:39:37', '2026-02-26 12:39:37'),
(185, 16, '2026-02-26', 'Ate my favorite food', 'Watched a movie with my friend. She felt happy', '', '', '2026-02-26 17:08:28', '2026-02-26 17:08:28'),
(186, 14, '2026-02-27', 'I am happy to see my daughter energetic and smart again after a few days.', 'I gave positive feedback about the lab assistant at the hospital I visited today, as she requested.', '', '', '2026-02-27 13:09:44', '2026-02-27 13:09:44'),
(187, 11, '2026-02-27', 'I had panipuri today', 'Helped mummy to buy groceries ', '', '', '2026-02-27 15:37:00', '2026-02-27 15:37:00'),
(188, 1, '2026-02-27', 'happy to meet my friends and we had great time at box cricket and got my engineering certificates', 'my friends are so happy', '', '', '2026-02-27 16:21:39', '2026-02-27 16:21:39'),
(189, 15, '2026-02-27', 'Felt happy met my father in the college.', 'All my friends are happy that i introduced my father to them', '', '', '2026-02-28 04:53:21', '2026-02-28 04:53:21'),
(190, 18, '2026-02-27', 'i played games with friends after a long time', 'me and my friends met after a lot of time\r\n', '', '', '2026-02-28 04:54:42', '2026-02-28 04:54:42'),
(191, 10, '2026-02-28', 'Happy to see my parents and went to temple with my mom.', 'My family was happy to see me', '', '', '2026-02-28 04:56:27', '2026-03-01 15:57:01'),
(192, 10, '2026-02-27', 'Happy to learn the things from Pavan bro which were aliened to my work and we had healthy discussion.', 'I hope Pavan bro was happy', '', '', '2026-02-28 05:00:00', '2026-02-28 05:00:00'),
(193, 16, '2026-02-28', 'Gonna eat good food tonight ', '', '', '', '2026-02-28 11:27:41', '2026-02-28 11:30:47'),
(194, 15, '2026-02-28', 'felt happy because one of my close friend got UK visa for his higher studies.', 'I suggested him the best coaching center for his preparation he reminded that and felt happy.', '', '', '2026-02-28 11:31:12', '2026-02-28 11:31:12'),
(195, 18, '2026-02-28', 'i had garlic naan today', 'i treated my friend :)', '', '', '2026-02-28 11:34:01', '2026-02-28 11:34:01'),
(196, 14, '2026-02-28', 'Iâ€™m happy itâ€™s the weekend', '', '', '', '2026-02-28 11:35:48', '2026-02-28 11:35:48'),
(197, 11, '2026-02-28', 'happy to talk to my friend after long she was waiting for my call from so long', 'my friend was happy bcz i talked to her after long', '', '', '2026-02-28 11:41:49', '2026-02-28 11:41:49'),
(198, 21, '2026-02-28', 'had dosa after long time', 'i made dosa for my mother', '', '', '2026-02-28 15:41:58', '2026-02-28 15:41:58'),
(199, 14, '2026-03-01', 'I am happy because I went to church with my family after many days.', 'My husband is happy because he helped me with cooking.', '', '', '2026-03-01 15:26:49', '2026-03-01 15:26:49'),
(200, 10, '2026-03-01', 'My dad prepared Chicken Curry for me.', 'My dad was happy because i helped him to take a decision regarding his work.', '', '', '2026-03-01 16:00:48', '2026-03-01 16:00:48'),
(201, 11, '2026-03-01', 'Happy to watch my parents marriage dvd', 'My dadi is happy bcz i cooked for her', '', '', '2026-03-01 16:04:41', '2026-03-01 16:04:41'),
(202, 16, '2026-03-01', 'Met my brother ', 'Brother was happy meeting me', '', '', '2026-03-01 17:56:10', '2026-03-01 17:56:10'),
(203, 15, '2026-03-01', 'Felt happy returned to home after 15 days', 'My mother felt more happy by seeing me.', '', '', '2026-03-02 04:40:28', '2026-03-02 04:40:28'),
(204, 18, '2026-03-01', 'i met my junior', 'me and my junior snuck out middle in the night to have ice cream', '', '', '2026-03-02 05:06:07', '2026-03-02 05:06:07'),
(205, 1, '2026-03-01', 'happy to meet my cousin and had great time watcing 2 movies back to back', 'my cousin is so happy', '', '', '2026-03-02 05:06:37', '2026-03-02 05:06:37'),
(206, 15, '2026-03-02', 'happy because my friend received the offer letter.', 'Prepared an egg curry that which liked by my entire family', '', '', '2026-03-02 12:53:08', '2026-03-02 12:53:08'),
(207, 14, '2026-03-02', 'Happy because I received mobile phone that I ordered ', 'My daughter is so happy with the water bottle we bought for her â€” itâ€™s her first time using it, and sheâ€™s enjoying sipping from it.', '', '', '2026-03-02 12:53:17', '2026-03-02 12:53:17'),
(208, 11, '2026-03-02', 'Happy to deploy newsportal', 'i helped the boy for his maths doubts who lives in neighbour', '', '', '2026-03-02 12:53:23', '2026-03-02 12:53:23'),
(209, 21, '2026-03-02', 'talking to my sister that made my day', 'my sister is happy talking to me', '', '', '2026-03-02 12:55:39', '2026-03-02 12:55:39'),
(210, 16, '2026-03-02', 'Cooked Lunch Today ', 'My roommate felt satisfied eating my lunch recipe ', '', '', '2026-03-02 12:57:36', '2026-03-02 12:57:36'),
(211, 10, '2026-03-02', 'Happy that my family confirmed About trip to Tirupati.', 'They were happy because i confirmed them that I\'ll be going with them too.', '', '', '2026-03-02 14:01:12', '2026-03-02 14:01:12'),
(212, 18, '2026-03-02', 'packed my luggage for tomorrow\'s trip ', '', '', '', '2026-03-02 14:11:56', '2026-03-02 14:11:56'),
(213, 1, '2026-03-02', 'happy to break my phone,  going to change my mobile after 18long months', 'my friends are finally reliefed by realizing im the same old rogue', 'to buy new phone', '', '2026-03-02 14:50:09', '2026-03-02 14:50:09'),
(214, 1, '2026-03-03', 'happy to know that my sister is going to buy a new house and excited to look apart', 'my family is so happy', '', '', '2026-03-03 12:34:53', '2026-03-03 12:34:53'),
(215, 15, '2026-03-03', 'Felt happy because ordered a gift for my sister.', 'Even i ordered without knowing to her she came to know that she felt happy.', '', '', '2026-03-03 12:44:45', '2026-03-03 12:44:45'),
(216, 16, '2026-03-03', 'We all helped Kruti decide name for her Project! ', 'I guess Kruti felt happy for our support', '', '', '2026-03-03 12:45:52', '2026-03-03 12:45:52'),
(217, 14, '2026-03-03', 'Iâ€™m happy to see my child doing her homework on her own. It feels like a new milestone', 'my child happy with the snack I prepared today', '', '', '2026-03-03 12:49:33', '2026-03-03 12:49:33'),
(218, 11, '2026-03-03', 'happy bcz i had gone for clothes shopping', 'my friend is happy bcz i helped her in work', '', '', '2026-03-03 12:51:45', '2026-03-03 12:51:45'),
(219, 10, '2026-03-03', 'My team members made happy by their funny talks.', 'i hope my team will feel happy after seeing this.', '', '', '2026-03-03 12:55:12', '2026-03-03 12:55:12'),
(220, 21, '2026-03-03', 'finnally my project is getting name.', 'working on my friend project he is happy for my efforts\r\n', '', '', '2026-03-03 12:55:52', '2026-03-03 12:55:52'),
(221, 1, '2026-03-04', 'happy to know that my parents will be coming to hyderabad this weekend', 'my sister was happy', 'to go home along with them', '', '2026-03-04 12:26:40', '2026-03-04 12:26:40'),
(222, 21, '2026-03-04', 'talking with mam about our future', 'mam is happy knowing our dark future', '', '', '2026-03-04 12:28:42', '2026-03-04 12:28:42'),
(223, 16, '2026-03-04', 'Got my new Skincare Productssss!! ðŸ«¶ðŸ»', 'The company owner must be happy that I had to spend thousands on those products. ', 'To buy more and more new products to try ', 'To provide stipend such that I can buy new ones ', '2026-03-04 12:30:14', '2026-03-04 12:30:14'),
(224, 14, '2026-03-04', 'It was a nice day, and Iâ€™m happy.', '', '', '', '2026-03-04 12:32:04', '2026-03-04 12:32:04'),
(225, 11, '2026-03-05', 'happy to receive my parcel today', 'my mother is happy bcz i m gonna cook dinner for family', '', '', '2026-03-05 11:16:35', '2026-03-05 11:16:35'),
(226, 16, '2026-03-05', 'Happy that I finally could able to eat barley comfortably ', 'My friend felt relieved when I listened to her dramatical fight story with her teammate and consoled her ', '', '', '2026-03-05 11:20:09', '2026-03-05 11:20:09'),
(227, 14, '2026-03-05', 'Iâ€™m happy that I ordered a dress for my daughter for her birthday.\r\n', 'My daughter is very thrilled after hearing our plan to celebrate her birthday.', '', '', '2026-03-05 11:22:34', '2026-03-05 11:22:34'),
(228, 15, '2026-03-06', 'Happy because my sister got married.', 'Met many relatives in the marraige after long time met the cousins they felt happy', '', '', '2026-03-06 12:42:17', '2026-03-06 12:42:17'),
(229, 11, '2026-03-06', 'i m happy bcz on sunday i m going to visit my cousin', 'my parents are happy bcz i agreed to go surat with them on sunday', '', '', '2026-03-06 12:43:08', '2026-03-06 12:43:08'),
(230, 14, '2026-03-06', 'happy because received birthday decoration orders ', 'My mother is happy to know that we will be in our native place for Easter.', '', '', '2026-03-06 12:53:05', '2026-03-06 12:53:05'),
(231, 10, '2026-03-06', 'I\'m able to prioritise and balance my work', 'Team is happy because i have cancelled the demo session today', '', '', '2026-03-07 06:33:18', '2026-03-07 06:33:18'),
(232, 16, '2026-03-06', 'Gifting chocolate to my friend ', 'I gave chocolate to my friend she felt happy ', '', '', '2026-03-07 06:53:53', '2026-03-07 06:53:53'),
(233, 11, '2026-03-07', 'i m happy bcz tommorrow i m going surat', 'my papa is happy bcz i received his parcel', '', '', '2026-03-07 12:21:37', '2026-03-07 12:21:37');
INSERT INTO `happy_sheet` (`id`, `user_id`, `entry_date`, `happy_today`, `happy_others`, `goals`, `dreams`, `created_at`, `updated_at`) VALUES
(234, 14, '2026-03-07', 'I am very thrilled about tomorrowâ€™s birthday party, even though it is a small function.', 'My daughter is also happy about tomorrow because it is her birthday.', '', '', '2026-03-07 12:21:49', '2026-03-07 12:21:49'),
(235, 15, '2026-03-07', 'Felt happy by seeing one of the insta story ....', 'I helped one of my friend to reach out to a HR in her domain regarding the internship and she felt happy.', '', '', '2026-03-07 12:27:13', '2026-03-07 12:27:13'),
(236, 10, '2026-03-07', 'I have taken my first session for Python to Pavan Bro', 'I hope Pavan Bro is happy Because of my teaching', '', '', '2026-03-07 12:36:39', '2026-03-07 12:36:39'),
(237, 11, '2026-03-08', 'Happy to go on outing to surat with family ', 'My little cousin was happy to meet me', '', '', '2026-03-08 16:46:43', '2026-03-08 16:46:43'),
(238, 10, '2026-03-08', 'Happy to watch cricket after long time and India won', 'My family was happy to discuss some things with me', '', '', '2026-03-09 09:11:15', '2026-03-09 09:11:15'),
(239, 16, '2026-03-09', 'Came home ', 'My parents are happy to see me', '', '', '2026-03-09 11:36:59', '2026-03-09 11:36:59'),
(240, 1, '2026-03-09', 'Happy to plan for tirupati one more time', 'My friends are excited', 'To execute this trip', '', '2026-03-09 13:06:01', '2026-03-09 13:06:01'),
(241, 11, '2026-03-09', 'i got chocolate box from my mama', 'my sisier is happy to interupt my meeting', '', '', '2026-03-09 13:23:25', '2026-03-09 13:23:25'),
(242, 14, '2026-03-09', 'I am happy to be learning a new technology like Flutter.', 'My husband is happy because we had a good talk.', '', '', '2026-03-09 13:27:46', '2026-03-09 13:27:46'),
(243, 15, '2026-03-09', 'Happy because my brother blessed with a baby boy...', '', '', '', '2026-03-09 13:31:12', '2026-03-09 13:31:12'),
(244, 18, '2026-03-09', 'came back to home after a long time', 'i got my mom ghumkas as gift', '', '', '2026-03-09 13:32:09', '2026-03-09 13:32:09'),
(245, 1, '2026-03-08', 'happy that India won the consecutive worldcup', 'Whole india must be happy', '', '', '2026-03-09 13:32:24', '2026-03-09 13:32:24'),
(246, 15, '2026-03-08', 'India won the T20WC champions for the third time.', 'The whole nation felt happy and joyful for the victory', '', '', '2026-03-09 13:34:17', '2026-03-09 13:34:17'),
(247, 14, '2026-03-08', 'I am happy today because we celebrated my daughter\'s birthday.', 'My daughter was so happy, like she had received many gifts.', '', '', '2026-03-09 13:34:28', '2026-03-09 13:34:28'),
(248, 10, '2026-03-09', 'My Best friend is Back', 'I got her ice-cream', '', '', '2026-03-10 05:49:13', '2026-03-10 05:49:13'),
(249, 21, '2026-03-10', 'happy to see new member in our family ', 'i took ton of photos for my sister thery are happy for that', '', '', '2026-03-10 10:36:07', '2026-03-10 10:36:07'),
(250, 1, '2026-03-10', 'Happy to give demo on IoT and deployed workforcepro', 'the team should be happy and varsha might be happy today', '', '', '2026-03-10 12:44:46', '2026-03-10 12:44:46'),
(251, 11, '2026-03-10', 'happy bcz i met my collage classmate today', 'my classmate was also happy meeting me', '', '', '2026-03-10 12:53:37', '2026-03-10 12:53:37'),
(252, 14, '2026-03-10', 'Today I am happy to hear that my cousin\'s health condition is getting better.', 'I made a dish that my daughter likes.', '', '', '2026-03-10 13:01:25', '2026-03-10 13:01:25'),
(253, 15, '2026-03-10', 'Felt happy and enthusiastic by listening to our team mates demos.', 'My sister is from Medical  background i thought her how to use google flow AI tool she felt happy.', '', '', '2026-03-10 13:15:39', '2026-03-10 13:15:39'),
(254, 18, '2026-03-10', 'i met my friends after a long time', 'we had pani puri', '', '', '2026-03-10 13:17:40', '2026-03-10 13:17:40'),
(255, 16, '2026-03-10', 'Saw a movie ', 'Video called my friend she felt happy', '', '', '2026-03-10 13:20:57', '2026-03-10 13:20:57'),
(256, 18, '2026-03-11', 'it was a normal day', '', '', '', '2026-03-11 12:31:17', '2026-03-11 12:31:17'),
(257, 15, '2026-03-11', 'felt happy that iam implemented RAG from scratch', 'My family members felt happy and joyful by listening to my song', '', '', '2026-03-11 13:04:50', '2026-03-11 13:04:50'),
(258, 21, '2026-03-11', 'happy to see my useless friends again', 'my friend are happy roasting me', '', '', '2026-03-11 13:12:11', '2026-03-11 13:12:11'),
(259, 11, '2026-03-11', 'happy bcz i talked to one of my teacher', 'my teacher was also happy talking to me', '', '', '2026-03-11 13:14:47', '2026-03-11 13:14:47'),
(260, 11, '2026-03-12', 'happy to talk to my cousin', 'my cousin was happy to talk to me after a long time', '', '', '2026-03-12 13:32:51', '2026-03-12 13:32:51'),
(261, 15, '2026-03-12', 'happy beacuse my brother got married', 'Got many insights about the skills like negotiations and storytelling that i shared with my friends ', '', '', '2026-03-13 12:02:00', '2026-03-13 12:02:00'),
(262, 11, '2026-03-13', 'i m going to have dosa which i was craving for ', 'my sister is happy bcz i m giving her treat for dosa', '', '', '2026-03-13 12:39:29', '2026-03-13 12:39:29'),
(263, 21, '2026-03-12', 'i told my principal the truth i am happy about that', 'he is happy to give me class', '', '', '2026-03-13 12:40:37', '2026-03-13 12:40:37'),
(264, 10, '2026-03-12', 'our trainer has taken for the lunch', 'i hope they are happy because i accompanied them', '', '', '2026-03-13 12:41:14', '2026-03-13 12:41:14'),
(265, 14, '2026-03-13', 'I am happy because I got a chance to spend the entire day with my mother, sister, and their children.', 'My sisterâ€™s son is really happy to have us here.', '', '', '2026-03-13 12:42:12', '2026-03-13 12:42:12'),
(266, 15, '2026-03-13', 'Happy that had a lunch prepared by my grandmother afte the long time its delicious.', 'me forced my grand mother to tell us the story , spent a joyful hour whole family felt happy', '', '', '2026-03-13 12:42:54', '2026-03-13 12:42:54'),
(267, 16, '2026-03-13', 'Received my Order!! ', 'I woke up early in the morning! mom is feeling happy for that ðŸ˜‘', '', '', '2026-03-13 12:43:10', '2026-03-13 12:43:53'),
(268, 1, '2026-03-13', 'happy to book tickets in new ALLU cinemas', 'I hope bhAAI must be happy and my cousin is very excited', '', 'to sponser for a movie per week as part of well being', '2026-03-13 12:43:11', '2026-03-13 12:43:11'),
(269, 21, '2026-03-13', 'happy to spend time with my friends in the last bench ', 'my mam is happy to see me coming to college two consecutive days', '', '', '2026-03-13 12:43:15', '2026-03-13 12:43:15'),
(270, 10, '2026-03-13', 'Happy that i completed My python Certiport exam and i have passed in it', 'Lakshmi Akka is happy because i brought her favourite food', '', '', '2026-03-13 12:43:34', '2026-03-13 12:43:34'),
(271, 11, '2026-03-14', 'happy bcz today i have come to surat to stay at my mama\'s home for some days', 'my little cousin is happy bcz i came to stay', '', '', '2026-03-14 11:43:51', '2026-03-14 11:43:51'),
(272, 14, '2026-03-14', 'Iâ€™m happy because we are going out with family.', 'My sisterâ€™s son is very excited because I told him we will go out after I finish my work. ', '', '', '2026-03-14 11:48:52', '2026-03-14 11:48:52'),
(273, 15, '2026-03-14', 'Happy because attended the devotional pooja in the morning felt very peaceful..', 'My sister felt happy that i took the pics of her for her birthday.', '', '', '2026-03-14 12:22:12', '2026-03-14 12:22:12'),
(274, 16, '2026-03-14', 'Going to eat out tonight', 'Had a talk with my brother. He felt happy ', '', '', '2026-03-14 12:26:50', '2026-03-14 12:26:50'),
(275, 21, '2026-03-14', 'small prank with my friend ', 'all are happy to about the prank i executed', '', '', '2026-03-14 13:42:58', '2026-03-14 13:42:58'),
(276, 10, '2026-03-14', 'My uncle is coming tomorrow and we will be going for shopping ', 'My family is happy because i will be going to my village for a Festival', 'Fulfilling my Grandparents dreams on me', 'Will try to launch every product in a unique way which will give a higher impact even without us\r\n', '2026-03-14 16:32:41', '2026-03-14 16:32:41'),
(277, 11, '2026-03-15', 'Happy to have aloopuri today', 'My little cousin is happy playing with me', '', '', '2026-03-15 13:12:32', '2026-03-15 13:12:32'),
(278, 18, '2026-03-14', 'the event i was organized finally came to an end', 'every student from the place i study had a Rollercoaster of emotions ', '', '', '2026-03-15 15:00:19', '2026-03-15 15:00:19'),
(279, 18, '2026-03-15', 'Lewis Hamilton finally got a podium after 2 years ', 'visted my grandparents after a long time', '', '', '2026-03-15 15:00:55', '2026-03-15 15:00:55'),
(280, 18, '2026-03-13', 'I made a website for my college ', 'my college loved it!', '', '', '2026-03-15 15:01:40', '2026-03-15 15:01:40'),
(281, 18, '2026-03-12', 'I have been appointed as the backend for the event ', 'went out with my friends ', '', '', '2026-03-15 15:02:23', '2026-03-15 15:02:23'),
(282, 14, '2026-03-15', 'Happy to cook with my sister-in-law and spend some time together talking.', 'My sister-in-law is also happy to spend time talking with me', '', '', '2026-03-16 06:08:10', '2026-03-16 06:08:10'),
(283, 1, '2026-03-16', 'happy to eat muddapappu avakay with ghee and papad', 'my neice is so happy that i bought her good amount of candies', '', '', '2026-03-16 11:14:03', '2026-03-16 11:14:03'),
(284, 1, '2026-03-15', 'happy to help in shifting things to new home, did coolie without wages', 'my sister must be proud of me', '', '', '2026-03-16 11:14:52', '2026-03-16 11:14:52'),
(285, 15, '2026-03-16', 'Happy because met my uncle after the long time..', 'I reminded the memories with uncle he felt very happy', '', '', '2026-03-16 11:45:06', '2026-03-16 11:45:06'),
(286, 11, '2026-03-16', 'happy bcz i m going out today evening', 'my little cousin is happy bcz i m gonna play with him', '', '', '2026-03-16 11:45:30', '2026-03-16 11:45:30'),
(287, 10, '2026-03-15', 'Met my uncle did the shopping for both festivals for our family', 'My sisters were very happy because i did shopping for them too and my mom is happy because after long time her brother gifted a saree which i have selected', '', '', '2026-03-16 11:47:28', '2026-03-16 11:47:28'),
(288, 14, '2026-03-16', 'I am happy because I returned home to Bangalore', 'I promised my motherâ€™s friend that I would encourage my mother to attend the school batch get-together', '', '', '2026-03-16 11:47:54', '2026-03-16 11:47:54'),
(289, 18, '2026-03-16', 'I attended bgis', 'with my friends', '', '', '2026-03-17 01:42:14', '2026-03-17 01:42:14'),
(290, 11, '2026-03-17', 'got my stippened today', 'my sister is happy bcz i paid for her parcel', '', '', '2026-03-17 11:20:11', '2026-03-17 11:20:11'),
(291, 14, '2026-03-17', 'I am happy because I tried a dish and it was successful', 'My daughter is happy with the dish I made', '', '', '2026-03-17 11:22:03', '2026-03-17 11:22:03'),
(292, 15, '2026-03-17', 'Happy because  that my first stipend is credited.', 'My family members felt happy for me', '', '', '2026-03-17 11:26:47', '2026-03-17 11:26:47'),
(293, 18, '2026-03-17', 'going to my grandparents house', 'i gifted my brother \r\n', '', '', '2026-03-18 08:36:55', '2026-03-18 08:37:20'),
(294, 11, '2026-03-18', 'Happy for my little cousin he got 1st rank in exams', 'My little cousin is happy bcz i gave him a gift', '', '', '2026-03-18 11:21:03', '2026-03-18 11:21:03'),
(295, 14, '2026-03-18', 'I am happy because I am feeling better from my cold and cough', 'I told my child she could burst the balloons with a pin at night with her father, which made her very happy.', '', '', '2026-03-18 11:23:38', '2026-03-18 11:23:38'),
(296, 16, '2026-03-18', 'Cooked Kaju Paneer Pulao!', 'Obviously, it turned out to be tasteful! Me, My parents, brother loved it.', '', '', '2026-03-18 12:10:44', '2026-03-18 12:10:44'),
(297, 18, '2026-03-19', 'visited grandparents home for ugadi', '', '', '', '2026-03-19 13:00:22', '2026-03-19 13:00:22'),
(298, 11, '2026-03-19', 'Happy bcz navartri started today', 'My neighbour is happy bcz i helped aunty', '', '', '2026-03-19 13:00:47', '2026-03-19 13:00:47'),
(299, 1, '2026-03-19', 'Happy to spend a quality time with my family', 'Sanvika must be really happy for spoiling my laptop by spilling wwater on it', '', '', '2026-03-19 13:11:34', '2026-03-19 13:11:34'),
(300, 1, '2026-03-18', 'happy to sponser my part by providing cricket kits for the students', 'my mom is happy that i sponserd for the cricket kits at her school', '', 'by providing more support to do these kind of things', '2026-03-19 13:13:40', '2026-03-19 13:13:40'),
(301, 15, '2026-03-19', 'Felt happy because celebrated the Ugadhi with family and friends , happy to eat lot of sweets.', ' Organized a small game among the family that which made them feel happy and joyful.', '', '', '2026-03-19 13:25:10', '2026-03-19 13:25:10'),
(302, 16, '2026-03-19', 'Happy to eat various dishes!', 'Praised my mom for her cooking skills, she felt happyyy!', '', '', '2026-03-19 14:07:22', '2026-03-19 14:07:22'),
(303, 10, '2026-03-16', 'I drank my favourite juice', 'My friend was happy to go out with me\r\n', '', '', '2026-03-19 14:07:50', '2026-03-19 14:07:50'),
(304, 10, '2026-03-17', 'I\'m able to see and recognise my work', 'I hope team was happy', '', '', '2026-03-19 14:09:23', '2026-03-19 14:09:23'),
(305, 10, '2026-03-18', 'I was happy to speak with my long-distance friend', 'My friend was very happy knowing that i will be going to my village this week', '', '', '2026-03-19 14:10:52', '2026-03-19 14:10:52'),
(306, 10, '2026-03-19', 'Had an auspicious day with My family', 'My mom is happy after seeing the saree which i brought for her', '', '', '2026-03-19 14:12:49', '2026-03-19 14:12:49'),
(307, 14, '2026-03-19', 'I am happy because I had a good day with my family.', 'My daughter is happy because we went out together.', '', '', '2026-03-19 17:14:24', '2026-03-19 17:14:24'),
(308, 21, '2026-03-19', 'meet made the day', 'i went to grandmother home she is happy to see me ', '', '', '2026-03-19 17:45:29', '2026-03-19 17:45:29'),
(309, 21, '2026-03-17', 'happy to see my stipend ', 'i gifted my friend with treat', '', '', '2026-03-19 17:48:56', '2026-03-19 17:48:56'),
(310, 21, '2026-03-18', 'homesick and my home made my day', 'i got my cousin a nice gift', '', '', '2026-03-19 17:51:40', '2026-03-19 17:51:40'),
(311, 18, '2026-03-20', 'had ice cream', 'its my friends birthday and i am going to surprise him tonight', '', '', '2026-03-20 11:08:11', '2026-03-20 11:08:11'),
(312, 14, '2026-03-20', 'I made a snack that I like after a long time', 'My husband is happy to help me with cooking', '', '', '2026-03-20 11:17:17', '2026-03-20 11:17:17'),
(313, 11, '2026-03-20', 'had kunafa chocolate', 'my little cousin is happy bcz i played with him', '', '', '2026-03-20 13:53:23', '2026-03-20 13:53:23'),
(314, 16, '2026-03-20', 'Got my birthday gift todayyyyy!!!! ', 'My friend felt super happy that I liked the gift he sent!!!! ', '', '', '2026-03-20 16:03:15', '2026-03-20 16:03:15'),
(315, 14, '2026-03-21', 'I am happy because my husband and I had a nice conversation.', 'My mother is slightly happy to hear that we may stay in our hometown for one week during Easter.', '', '', '2026-03-21 12:23:30', '2026-03-21 12:23:30'),
(316, 11, '2026-03-21', 'Nothing to be happy today', '', '', '', '2026-03-21 13:35:20', '2026-03-21 13:35:20'),
(317, 18, '2026-03-21', 'was sick today so not really a productive day', '', '', '', '2026-03-22 04:27:38', '2026-03-22 04:27:38'),
(318, 11, '2026-03-22', 'Happy bcz i m out with my mama mami today', 'My little cousin was happy playing with me ', '', '', '2026-03-22 11:31:37', '2026-03-22 11:31:37'),
(319, 14, '2026-03-22', 'I am happy because I met someone familiar from my hometown at church.', 'The aunty from my hometown I met today was also happy to talk to me.', '', '', '2026-03-23 09:04:26', '2026-03-23 09:04:26'),
(320, 15, '2026-03-22', 'Happy to watch DHURANDHAR 2 , the movie was just insane..', 'I forced my friends to watch DHURANDHAR they said first they are not intrested, after watching the movie they felt joyful and intresting', '', '', '2026-03-23 11:03:03', '2026-03-23 11:03:03'),
(321, 1, '2026-03-20', 'i lost my laptop but hardisk is safe with me', 'my all wellwishers must be happy because atleast i left out with harddisk', '', '', '2026-03-23 11:17:10', '2026-03-23 11:17:10'),
(322, 18, '2026-03-22', 'bought parents gifts with my first salary', 'they loved it', '', '', '2026-03-23 11:17:37', '2026-03-23 11:17:37'),
(323, 1, '2026-03-21', 'saw dhurandhar , it was so amazing', 'every indian must be happy after watching the movie', '', '', '2026-03-23 11:17:40', '2026-03-23 11:17:40'),
(324, 18, '2026-03-23', 'we booked tickets to durandar 2 tonight with friends', 'we r really exicted', '', '', '2026-03-23 11:18:08', '2026-03-23 11:18:08'),
(325, 1, '2026-03-22', 'bought a new laptop', 'sanvika is happy as she got to know sh can use my old laptop as play tool', '', '', '2026-03-23 11:18:17', '2026-03-23 11:18:17'),
(326, 15, '2026-03-20', 'Happy to attempt TCS NQT test ..', 'I given suggestions to my friends  based on  my test like How the paper was and what kind of questions they asked so they felt happy', '', '', '2026-03-23 11:18:32', '2026-03-23 11:18:32'),
(327, 1, '2026-03-23', 'transfered all projects to my new laptop and running all projects', 'anjali must be happy as all projects were safe', '', '', '2026-03-23 11:19:03', '2026-03-23 11:19:03'),
(328, 11, '2026-03-23', 'i m going out tonight', 'my little cousin is happy bcz i helped him in his homework', '', '', '2026-03-23 11:20:41', '2026-03-23 11:20:41'),
(329, 16, '2026-03-23', 'Came to our room in Hyderabad ', 'My roommate is happy that I came so that she doesn\'t have to stay alone', '', '', '2026-03-23 11:27:00', '2026-03-23 11:28:32'),
(330, 14, '2026-03-23', 'I am happy because the product was finally picked up for return after many attempts.', 'My daughter is very happy because I made her favorite snack after many days.', '', '', '2026-03-23 11:31:00', '2026-03-23 11:31:00'),
(331, 15, '2026-03-23', 'Happy to present gift for my sister on her birthday', 'She felt very surprisded and happy', '', '', '2026-03-24 09:54:06', '2026-03-24 09:54:06'),
(332, 11, '2026-03-24', 'i m happy bcz papa bought me nath the one i liked at jwellers shop', 'my papa , family and my jiju is happy bcz i mreturning back to home tommorrow', '', '', '2026-03-24 11:24:13', '2026-03-24 11:24:13'),
(333, 15, '2026-03-24', 'Happy to know about the new transformer reserach paper and it gave me valuable insights.', 'I have made the pineapple juice which liked by my family', '', '', '2026-03-24 11:31:22', '2026-03-24 11:31:22'),
(334, 1, '2026-03-24', 'Happy that ive got tickets of RCB vs SRH match', 'my friends are so much excited to selll those tickt for blackmoney', '', '', '2026-03-24 11:31:57', '2026-03-24 11:31:57'),
(335, 16, '2026-03-24', 'Did some haircare today', 'My hair is transforming into its healthiest form ', '', '', '2026-03-24 11:33:39', '2026-03-24 11:33:39'),
(336, 10, '2026-03-23', 'I have brought my mom\'s Favourite Bangles and And some other things for her from tirupati', 'My Mom Felt Very by after seeing the things which i brought for her....', '', '', '2026-03-24 11:35:31', '2026-03-24 11:35:31'),
(337, 10, '2026-03-22', 'after 12 hrs of waiting i got a divine darshanam in Tirupati and My Brother gifted me a cute toy!', 'I hope my Sister-in-law will be happy because i brought her favourite food', '', '', '2026-03-24 11:42:40', '2026-03-24 11:42:40'),
(338, 10, '2026-03-21', 'Happy that i have climbed 3550 steps of Tirupati  ', 'My uncle was happy to meet me in Tirupati after long years', '', '', '2026-03-24 11:44:49', '2026-03-24 11:44:49'),
(339, 10, '2026-03-20', 'My brother gifted me a dress for the ram navami festival', 'I hope my brother is happy after seeing my reaction....', '', '', '2026-03-24 11:46:39', '2026-03-24 11:46:39'),
(340, 10, '2026-03-24', 'I\'ll be travelling to my village today....', 'I hope My Grand Parents will be eagerly waiting to see me...', '', '', '2026-03-24 11:48:20', '2026-03-24 11:48:20'),
(341, 14, '2026-03-24', 'I am happy because we all played ball together with my child.', 'My child is also happy playing with us.', '', '', '2026-03-25 11:10:28', '2026-03-25 11:10:28'),
(342, 1, '2026-03-25', 'happy to see a new intern in the team', 'the team must be so happy by welcoming new product owner', '', '', '2026-03-25 11:44:28', '2026-03-25 11:44:28'),
(343, 11, '2026-03-25', 'i m back home and i m happy bcz my papa was so happy seeing me home ', 'my family is happy bcz i m back and my sister is happiest bcz i m back she chatted a lot', '', '', '2026-03-25 11:44:39', '2026-03-25 11:44:39'),
(344, 15, '2026-03-25', 'Happy that our team got selected for the second round of VIBECON Hackathon by Emergent.', 'Varshith felt very happy and thanked me that i forced to enroll.', '', '', '2026-03-25 11:47:23', '2026-03-25 11:47:23'),
(345, 14, '2026-03-25', 'I received an invitation today for my cousinâ€™s daughterâ€™s wedding, and I am very excited to attend.', 'My cousin sister is also happy to hear that I will attend the wedding.', '', '', '2026-03-25 11:51:22', '2026-03-25 11:51:22'),
(346, 10, '2026-03-25', 'My Grandpa cooked my favourite Fish Curry today', 'My Grandparents and my Family mem Are very happy to see mee', 'Giving equal importance to the family and managing the work', '', '2026-03-25 11:53:49', '2026-03-25 11:53:49'),
(347, 21, '2026-03-25', 'ate a lot of fruits feeling a lot healthy', 'giving fruits to my friends that they should be healthy but dont ask what happened after that', '', '', '2026-03-25 11:54:10', '2026-03-25 11:54:10'),
(348, 18, '2026-03-25', 'my relatives came to visit', 'my team is very happy because i agreed ', '', '', '2026-03-25 12:25:09', '2026-03-25 12:25:09'),
(349, 22, '2026-03-25', 'I joined the company today and felt excited to start my journey ', 'I introduced myself to the team and showed enthusiasm to learn ', 'To learn new skills and contribute positively ', '', '2026-03-25 13:02:03', '2026-03-25 13:02:03'),
(350, 16, '2026-03-25', 'Went out', 'PVR people must be happy cancelling my movie today', '', '', '2026-03-26 06:35:07', '2026-03-26 06:35:07'),
(351, 15, '2026-03-26', 'Happy to recall the old moments with my friend..', 'My friend felt very happy that I remembered every thing..', 'As of now My goal is to get shortlisted for VIBECON.', '', '2026-03-26 11:27:52', '2026-03-26 11:29:24'),
(352, 1, '2026-03-26', 'happy to have a session with brajesh sir and got some feedback and i got to know that if we buy tickets for srh match, jersey will be free!', 'Whole srh fans are happy seeing that post', '', 'to go for IPL finals and see the RCB lifting trophy again', '2026-03-26 11:28:31', '2026-03-26 11:28:31'),
(353, 11, '2026-03-26', 'i m happy to start my excersize schedule again after 10 days', 'i guided and helped my sister to do face yoga she was happy', '', 'wanna go on trip on one of below place in april or may (dhwarka,ujjain,south india,rajasthan)', '2026-03-26 11:31:17', '2026-03-26 11:31:17'),
(354, 22, '2026-03-26', 'Almost completed assigned task ', 'Helped my friend in college project ', '', 'To make myself happy ', '2026-03-26 11:31:18', '2026-03-26 11:31:18'),
(355, 16, '2026-03-26', 'The lunch recipe which I made today turned out to be tastyyyy!!', 'My roommate is happy to eat good lunch', 'To master cooking!', 'Buy a Polaroid Cam ', '2026-03-26 11:33:38', '2026-03-26 11:33:38'),
(356, 14, '2026-03-26', 'I am going to make biryani for dinner tonight', 'My family is happy because everyone likes biryani.', '', 'Helping me have a good career', '2026-03-26 11:36:02', '2026-03-26 11:36:02'),
(357, 10, '2026-03-26', 'Had a Good conversation with the team and excited for tomorrow\'s festival', 'My brother is happy bcz i sent some money to him and i hope my Grand ma is Happy bcz i helped her to cleaning', 'Completing the tasks which were assigned to me and helping the team to grow', 'Taking my grandparents and aunt to the movie in this week if possible', '2026-03-26 12:05:09', '2026-03-26 12:05:09'),
(358, 18, '2026-03-26', 'visiting my grandparents today', 'I agreed to watch movie with them again\r\n', '', '', '2026-03-26 12:28:26', '2026-03-26 12:28:26'),
(359, 21, '2026-03-26', 'happy to see my friends and eating food with them', 'i gave a nice treat to them after the lunch they are happy for that', '', '', '2026-03-26 23:52:35', '2026-03-26 23:52:35'),
(360, 8, '2026-03-26', 'i had a healthy session with the team. i am able to see my long term goal as part of this team and also a facilitator for the company to collaborate and growth . i am able to understand that each goal , each dream , requires a consistent effort every day or every few days for us to achieve that goal or dream , however impossible it feels like.', 'the team values my inputs and by the 1 hour that i took with demo for each product i am able to make them and their products on path to success, while keeping the fun and happy together among all of us.', 'i want to be an airline pilot.\r\n', 'i want to be a facilitator for agriculture and solar and for business growth for many small and medium people or groups.\r\nwe will motivate 1000s of people to be successful and help india to grow to be more successful.', '2026-03-27 10:13:33', '2026-03-27 10:13:33'),
(361, 11, '2026-03-27', 'going to visit temple at evening', 'helped my mom in her work', '', 'need to take out time and play badminton again in badminton court', '2026-03-27 11:22:48', '2026-03-27 11:40:44'),
(362, 22, '2026-03-27', 'Celebrating Ram Navami with prayers, positivity, and peaceful vibes.', 'Distribution of food ', '', 'To visit Ladakh ', '2026-03-27 11:25:45', '2026-03-27 11:25:45'),
(363, 10, '2026-03-27', 'Temple visits and Family gatherings and i\'m so excited for tonight as i will be meeting all my old friends....', 'I hope my friends and family mem were happy for My presence', '', ' Need to Have some family meetiings very often', '2026-03-27 11:29:14', '2026-03-27 11:29:14'),
(364, 14, '2026-03-27', 'Seeing my daughter excitedly talking about our plans after going to our native place during Easter makes me feel happy too', 'My daughter is very thrilled after hearing about our Easter plans to go to our native place', '', 'I dream of having a day when I feel proud of myself, my skills, and my job position.', '2026-03-27 11:33:28', '2026-03-27 11:33:28'),
(365, 21, '2026-03-27', 'now i am able to eat with my right hand and play little bit guitar tooo finally.', 'brought watermelon to home feeling responsible.', '', 'one day i become a musian and play guitar infront of countless members', '2026-03-27 11:38:33', '2026-03-27 11:41:04'),
(366, 16, '2026-03-27', 'Started watching a K-Drama after many months! ', 'My friend is happy to watch drama with me', 'Go on a trip before BTech ends ', '', '2026-03-27 12:04:46', '2026-03-27 12:04:46'),
(367, 18, '2026-03-28', 'today we celebreate my grandparents 50th aniversary ', 'they liked the surprise we gave', '', '', '2026-03-28 04:55:31', '2026-03-28 12:15:54'),
(368, 15, '2026-03-27', 'Happy to be a part of devotional bhajanas of Lord Rama.', 'my father is hapy that i successfully completed the work which he said.', 'need to win the Incedo DS Hackathon', 'Team support and help if needed in the DS hackathon', '2026-03-28 05:02:20', '2026-03-28 05:02:20'),
(369, 1, '2026-03-27', 'im so happy that i went to DLF along with my frnd', 'my friend is so happy as it was first time for them being there', '', 'virat scorring a centry in today match\r\n', '2026-03-28 07:46:52', '2026-03-28 07:46:52'),
(370, 11, '2026-03-28', 'i m happy bcz i m going  to watch movie dhurandhar the revenge and for dinner with my sisters and brother in law', 'my grandmother is happy bcz i made watermelon juice for her', 'i want to learn next js completely as soon as possible', 'i want to buy myself a silver earings', '2026-03-28 11:18:46', '2026-03-28 11:18:46'),
(371, 1, '2026-03-28', 'happy and excited for ipl, beacause i no longer need to search for a new movie everyday', 'my sister\'s daughter is so happy as im going for her playschool annual day', 'my goal is to have a trip for pakistan', 'my dream is to play cricket at lords cricket ground', '2026-03-28 12:03:07', '2026-03-28 12:03:07'),
(372, 15, '2026-03-28', 'happy because Iam successfully completed the Incedo Ds Innovation.', 'Even i helped my friend to complete the it successfully.', 'Expecting the good results ..', 'Need to increase the user experience of OTT platforms.', '2026-03-28 12:04:43', '2026-03-28 12:05:43'),
(373, 14, '2026-03-28', 'I am happy because I am going to make \'kozhukkatta\', as it is a special snack for this day.', 'My child is also excitedly waiting for that snack, as it is made only once a year.', '', 'I dream of buying a nose stud on my own and wearing it.', '2026-03-28 12:05:42', '2026-03-28 12:05:42'),
(374, 21, '2026-03-28', 'finally virat kohli is to back to Chinnaswamy Stadium i hape we win the match', 'we got a projector to see ipl matchs .all my friends are happy to fight for thier bot teams.', '', 'rcb lifting thier consecutive cup ', '2026-03-28 12:08:53', '2026-03-28 12:08:53'),
(375, 22, '2026-03-28', 'Going to my friendâ€™s house to enjoy and watch IPL together', 'Visiting my friend and spending fun time together', '', 'Seeing RCB win', '2026-03-28 12:09:36', '2026-03-28 12:09:36'),
(376, 18, '2026-03-27', 'went to eat out', 'my grandparents liked it', '', '', '2026-03-28 12:20:20', '2026-03-28 12:20:20'),
(377, 10, '2026-03-28', 'I slept until 9am today and this is my first time in the village sleeping until that time but didn\'t get scoldings', 'My Syster-in-law was Happy because i have handled her child from the morning........', 'I want to grow calmly without comparing others', 'Rcb lifting the Trophy again on this year....', '2026-03-28 12:37:36', '2026-03-28 12:37:36'),
(378, 8, '2026-03-27', 'Travelled to a new city.', 'played with a 1 year child with a swollen area near the eye. ', 'Save 1 lakh hours of people every year by bringing social change or automation through our information and portals.\r\n\r\nBecoming a team of growth consultants for 10 new companies per month . ', 'A world tour with our team as a music band , with concerts in 10 rich cities and 10 poor cities of the world.  ', '2026-03-28 12:51:39', '2026-03-30 05:23:36'),
(379, 16, '2026-03-28', 'I got praisings from my friend\'s parents for my lunch recipe todayyy!! ', 'While taking an escalator, I helped an old lady. She\'s thankful for me.', 'To do shopping without asking for my mother\'s permission ðŸ˜®â€ðŸ’¨', '', '2026-03-28 13:06:51', '2026-03-28 13:06:51'),
(380, 8, '2026-03-28', 'The project list is making my mind clear on what i want to achieve and what Mukesh Khatri (youtube , mikeshkhatri.com) are achieving and how.', 'Teasing some native Mexicans that I am Chinese or Russian and they say my face looks like Hindu or Pakistani.  ', 'I want to learn swimming and one day be in an ocean on my own without a life jacket. \r\n\r\n', 'I wish everyone in our team to visit a government school once a month for one full day, and a government hospital once a month for one full day. \r\n\r\nI want to see what it takes to convert 1 car from petrol to solar + battery. \r\n\r\nI want to know , test , implement what it takes for a house to add solar  panel and also remodel things in house to reduce electricity consumption rather than just switching to solar. \r\n\r\nI want to understand the supply chain , components, cost , long term duration of battery for a car, bike. ', '2026-03-29 05:08:51', '2026-03-30 05:22:54'),
(381, 11, '2026-03-29', 'Had my favourite icecream ', 'My parents are happy to play badminton with me ', 'To follow up my routine ', 'Hope that I can meet my teammates someday ', '2026-03-29 14:17:48', '2026-03-29 17:06:00'),
(382, 14, '2026-03-29', 'I had a good playtime with my daughter', 'My daughter is also happy to play with me.', '', 'I had a dream of enjoying a day of shopping without any financial worries.', '2026-03-29 15:19:24', '2026-03-29 15:19:24'),
(383, 18, '2026-03-29', 'came back home', 'gaming with my friends after a long time', 'need to focus', 'wish to work with 10x agents for better workflow', '2026-03-29 16:58:02', '2026-03-29 16:58:02'),
(384, 16, '2026-03-29', 'Went to a family function. Met many of my relatives!', 'My cousin is happy because I came to the function. ', 'To get fit', '', '2026-03-29 17:18:33', '2026-03-29 17:18:33'),
(385, 15, '2026-03-29', 'Happy That MI Won the match', 'On my friend birthday i suggested him to go the Ancient temple he felt happy.', 'My goal is to visit the Banglore and explore in the April..', 'providing more training sessions', '2026-03-29 17:32:15', '2026-03-29 17:32:15'),
(386, 1, '2026-03-29', 'hapy to go to cafe nilofor today with my friend', 'my friend is happy as ive taken her out.', 'my short term goal is to have a guide speaker for any product i have, and i want to be the owner of it', 'serphawk can guide me just like they always do and push me towards my goal', '2026-03-29 17:46:02', '2026-03-29 17:46:02'),
(387, 10, '2026-03-29', 'Went to the movie with my cousins after a long time', 'My Cousins were Happy because i payed  for Snacks', 'To go to a trip after my cousins returns to the bangalore', 'I hope SERP Hawk Will continuously support for my Learning and growth', '2026-03-30 04:51:26', '2026-03-30 04:51:26'),
(388, 8, '2026-03-30', 'Walked and supported an old lady with difficulty in walking for 1 full day. It meant a lit and can see value of old age people support with different contexts in different countries, different context for rich and poor in each country , city,culture.', 'A family told me multiple thanks for supporting this lady.', 'I want to visit few countries.  ', 'I want to find use cases where our softwares can help people in different countries lead a better life. ', '2026-03-30 05:28:55', '2026-03-30 05:28:55'),
(389, 21, '2026-03-29', 'happy to watch my all time fav movies the amazing spider man 1& 2', 'i brought badam milk for my family', 'i should be increamental productive', 'i want to explore new sectors where i can make helpfull tool that should be helpful for me first', '2026-03-30 05:45:19', '2026-03-30 05:45:19');

-- --------------------------------------------------------

--
-- Table structure for table `learning_goals`
--

CREATE TABLE `learning_goals` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `goal` text NOT NULL,
  `type` enum('book','skill','other') DEFAULT 'other',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `learning_goals`
--

INSERT INTO `learning_goals` (`id`, `user_id`, `goal`, `type`, `created_at`, `updated_at`) VALUES
(1, 1, 'Learning code igniter', 'other', '2026-02-03 08:58:50', '2026-02-03 08:58:50'),
(2, 15, 'Focused on Langchain and GenAI', 'other', '2026-02-03 12:49:45', '2026-02-03 12:49:45'),
(3, 16, 'Learning Natural Language Processing', 'other', '2026-02-03 12:57:46', '2026-02-04 13:51:58'),
(6, 18, 'learning about stack and que\'s (DSA)', 'other', '2026-02-03 17:17:50', '2026-02-06 12:51:32'),
(7, 11, 'focused on codeigniter', 'other', '2026-02-04 13:02:56', '2026-02-04 13:02:56'),
(9, 10, 'learning codegniter along with react.js', 'other', '2026-02-04 13:57:53', '2026-02-04 13:57:53'),
(10, 17, 'Focused ,in Phython for integration Project.', 'other', '2026-02-04 14:02:12', '2026-02-05 03:21:58'),
(16, 21, 'trying to learn best way of prompting.', 'other', '2026-02-09 18:36:42', '2026-02-09 18:36:42'),
(17, 14, 'learning codeIgniter with AI', 'other', '2026-02-11 13:46:57', '2026-02-11 13:46:57');

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` int(11) NOT NULL,
  `type` enum('serphawk','personal') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `type`, `title`, `description`, `image_path`, `created_by`, `created_at`) VALUES
(1, 'serphawk', 'LinguaVoice', 'LinguaVoice is an intelligent, real-time audio transcription and language learning platform that transforms spoken words into personalized learning experiences. Built with Flask and powered by Google\'s Gemini AI, it combines speech recognition, adaptive learning algorithms, and AI tutoring to create an immersive language acquisition environment.\r\n\r\nâœ¨ Key Features\r\nðŸŽ¤ Real-Time Multilingual Transcription\r\n3-Language Support: English, Spanish, and Hindi with offline Vosk models\r\nIntelligent Audio Processing: Advanced speech activity detection with quality filtering\r\nSmart Language Detection: Automatic language identification with script validation (Devanagari for Hindi, special characters for Spanish)\r\nHigh-Quality Audio Storage: Saves only clear, validated speech samples with confidence scoring\r\nðŸ§  Adaptive Learning Engine\r\nPersonalized Vocabulary Tracking: Automatically identifies and stores new words from spoken conversations\r\nMastery-Based Progression: Tracks word frequency, correct/incorrect attempts, and mastery levels (0-5)\r\nOut-of-Vocabulary (OOV) Detection: Identifies unfamiliar words and provides AI-generated definitions\r\nIncremental Learning System: Generates contextual vocabulary suggestions based on user proficiency\r\nðŸ¤– AI-Powered Features\r\nGemini AI Integration: Real-time word definitions, synonyms, and contextual examples in multiple languages\r\nAI Tutor: Interactive conversational practice with pronunciation checking\r\nGrammar Validation: Integrated LanguageTool API for real-time grammar correction\r\nAdaptive Quiz Generation: Dynamic quizzes tailored to user\'s learning level\r\nðŸ“Š Comprehensive Analytics\r\nProgress Tracking: XP system, streak counters, and level progression (Beginner â†’ Proficient)\r\nPerformance Analytics: Response time tracking, accuracy metrics, and difficulty analysis\r\nLearning Sessions: Daily word counts, session history, and achievement milestones\r\nVisual Dashboards: Modern, interactive UI with real-time statistics\r\nðŸŽ“ Structured Learning Paths\r\n100-Level Progression System: Tiered learning from basics to advanced proficiency\r\nInteractive Flashcards: Spaced repetition for vocabulary retention\r\nGamified Quizzes: Multiple-choice, fill-in-the-blank, and pronunciation challenges\r\nCertificate Generation: Achievement certificates upon course completion\r\nðŸŽ¨ Modern User Experience\r\nResponsive Design: Mobile-first, glassmorphic UI with smooth animations\r\nDark Mode Support: Premium aesthetics with gradient accents\r\nReal-Time Updates: Live transcription feed and instant vocabulary validation\r\nCommunity Features: Collaborative learning and progress sharing\r\nðŸ› ï¸ Technical Stack\r\nBackend:\r\n\r\nFlask (Python web framework)\r\nSQLite (Multi-database architecture: transcriptions, vocabulary, user progress)\r\nVosk (Offline speech recognition)\r\nGoogle Generative AI (Gemini 2.5 Flash)\r\nFrontend:\r\n\r\nHTML5, CSS3, JavaScript\r\nModern UI with glassmorphism and micro-animations\r\nReal-time audio visualization\r\nAPIs & Services:\r\n\r\nLanguageTool API (Grammar checking)\r\nDatamuse API (Word similarity)\r\nCustom offline language detection\r\nðŸ”¥ Unique Selling Points\r\nZero-Latency Transcription: Offline models ensure privacy and instant processing\r\nContext-Aware Learning: Learns from your actual conversations, not generic word lists\r\nMulti-Script Support: Handles Latin, Devanagari, and special characters seamlessly\r\nQuality-First Approach: Only saves high-confidence transcriptions with validated audio\r\nAdaptive Difficulty: Automatically adjusts learning content based on performance\r\nðŸ“ˆ Use Cases\r\nLanguage learners practicing pronunciation and vocabulary\r\nMultilingual professionals tracking language usage\r\nEducators creating personalized learning paths\r\nSpeech therapy and accent improvement\r\nReal-time meeting transcription with learning insights\r\nðŸš€ Performance Highlights\r\n3-Second Audio Chunks: Optimized for real-time processing\r\nConfidence Filtering: 30%+ threshold ensures accuracy\r\nSmart Caching: Reduces API calls with offline vocabulary sets\r\nSession Management: User-specific transcription isolation\r\n', '', 1, '2026-02-04 13:17:19'),
(2, 'personal', 'Attendance Dashboard ', 'In this dashboard this there is a portion of task management . ', '', 20, '2026-02-04 19:11:21'),
(3, 'personal', 'DeepLearning based Anomaly Detection', 'With the help of deep Learning techniques finding the root cause of anamoly detection and improve the latency', '', 15, '2026-02-05 16:20:13'),
(4, 'personal', 'Advanced DeepLearning enabled Navigation assistance', 'To install the model into cars so taht even in failure of lights.\r\n\r\nlarge growing and high risk market', '', 1, '2026-02-05 16:37:56'),
(5, 'personal', 'Fix it', 'The only app you need for your home and lifestyle. From fixing a leak and finding a nanny to booking a cab session or securing your next rental apartment, we connect you with verified professionals instantly. Your life, simplified', '', 11, '2026-02-05 16:39:53'),
(6, 'personal', 'expense-tracker', 'it lets you keep a track of your monthly expenditure so that we have a sense of whats the income and expense and the net saving of our desired goal \r\n\r\nthis is so that we can keep a track of how close we are to out goal and how long would it would take to save.', '', 18, '2026-02-05 16:53:45'),
(7, 'personal', 'Personal Finance Advisor for Everyday Families', 'This project is a personal finance management and advisory system designed for normal individuals and families who struggle with day-to-day expenses and future financial planning. Unlike traditional expense trackers that only record past spending, this system focuses on understanding both present and future financial needs and guiding users to make better financial decisions.\r\n\r\nUsers can enter their regular income, daily expenses, and upcoming financial responsibilities such as family functions (for example, cousinâ€™s marriage gift and clothing), childrenâ€™s school or college admission fees, loan EMIs, and expected medical or emergency expenses. The system also allows users to store family member details such as age, role (student, working, dependent), and upcoming life events, which helps in estimating future costs more accurately.\r\n\r\nBased on this information, the application continuously analyzes spending patterns, future obligations, and available income. It provides personalized advice on how much to save, where to reduce unnecessary expenses, and how to prepare for upcoming financial commitments. The system warns users if their current spending trend may cause financial problems in the future and suggests practical actions to avoid shortages.\r\n\r\nAn AI-based advisory module is used to generate user-friendly guidance messages such as savings recommendations, expense reduction tips, and alerts about financial risks. The system can also notify users when suitable investment or saving options become available based on their financial profile, risk level, and future goals.\r\n\r\nThe main aim of this project is not to serve high-income individuals or businesses, but to support ordinary people and families who live on fixed or limited incomes. It acts like a personal financial advisor for each user, helping them plan for known future expenses, handle emergencies better, and slowly build savings while continuing their normal daily life.', '', 14, '2026-02-05 17:54:31'),
(8, 'personal', 'creating stock market screener', 'this project make stocks easier to filter and make a decision to take a stock based on the news. Not a stock predictor but a stock helping tool.\r\n', 'uploads/projects/6984d64a1fb03_Screenshot 2026-02-05 224511.png', 21, '2026-02-05 23:11:30');

-- --------------------------------------------------------

--
-- Table structure for table `project_members`
--

CREATE TABLE `project_members` (
  `project_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `project_members`
--

INSERT INTO `project_members` (`project_id`, `user_id`) VALUES
(1, 1),
(1, 8),
(1, 18);

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `task_date` date NOT NULL,
  `description` text DEFAULT NULL,
  `github_link` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `user_id`, `task_date`, `description`, `github_link`, `created_at`, `updated_at`) VALUES
(2, 11, '2026-02-03', 'created replica of economytimes frontend using trickle.so and chatgpt', '', '2026-02-03 12:42:21', '2026-02-03 12:42:21'),
(3, 1, '2026-02-03', 'completed building the sheets website ', '', '2026-02-03 12:47:36', '2026-02-03 12:47:36'),
(4, 14, '2026-02-03', 'I tried amazon q with visual studio code, fixing bugs in my job portal from the start', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-03 12:50:26', '2026-02-03 12:50:26'),
(5, 16, '2026-02-03', 'Worked on The Economic Times - Added AI features, Identified Implementable Tech Stacks', '', '2026-02-03 12:52:06', '2026-02-03 12:52:06'),
(6, 12, '2026-02-03', 'started work on the resume skill extractor', '', '2026-02-03 13:04:14', '2026-02-03 13:04:14'),
(7, 18, '2026-02-03', 'studied about stock market and made the transcriber feature functional and started working on other features to make them functional as well', '', '2026-02-03 17:15:15', '2026-02-03 17:15:15'),
(8, 20, '2026-02-04', 'Enhanced the KPICard component by improving layout structure and adding hover interactions for better UI/UX.\r\n\r\nUpdated the Sidebar component to dynamically render menu items based on user roles and implemented a logout confirmation flow.\r\n\r\nImproved the TaskTree component by adding task type and priority indicators, along with stricter permission logic for task editing.', 'https://github.com/shubhcoding01/attendance_dashboard', '2026-02-04 12:51:49', '2026-02-04 12:51:49'),
(9, 11, '2026-02-04', 'have had a made a blueprint and design database and added dummy records for news website', '', '2026-02-04 12:58:33', '2026-02-04 12:58:33'),
(10, 16, '2026-02-04', 'Worked on planning CRM Project', '', '2026-02-04 13:25:57', '2026-02-04 13:25:57'),
(11, 14, '2026-02-04', 'modified my profile page of candidate in job portal, implementing job filter', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-04 13:26:39', '2026-02-04 13:26:39'),
(12, 1, '2026-02-04', 'Redesigned landing page, and worked on CRM project', '', '2026-02-04 13:33:10', '2026-02-04 13:33:10'),
(13, 18, '2026-02-04', 'deployed the health agent application \r\nready to be tested, took a look at new crm project and formulating a plan to build it.', 'https://github.com/Paardhu22/health-agent', '2026-02-04 13:39:30', '2026-02-04 13:39:30'),
(14, 15, '2026-02-04', 'Implemented the calender feature in the Job portal', '', '2026-02-04 13:39:47', '2026-02-04 13:39:47'),
(15, 17, '2026-02-04', 'I am currently updating my Job Portal project and researching Economic Times job listings, documentation, features, and workflows to understand best practices and implement them effectively using Laravel', '', '2026-02-04 13:50:47', '2026-02-04 13:50:47'),
(16, 11, '2026-02-05', 'Designed ui for 2 webpages and then my system crashed', '', '2026-02-05 10:59:26', '2026-02-05 10:59:26'),
(17, 1, '2026-02-05', 'Frontend part of crm project and created instances in the database', '', '2026-02-05 13:26:53', '2026-02-05 13:26:53'),
(18, 16, '2026-02-05', 'Coverted CRM trickle file into NextJS in AntiGravity', '', '2026-02-05 14:07:11', '2026-02-05 14:07:11'),
(19, 14, '2026-02-05', 'made job listing page with a feature of filteration by category, location, etc., also also made my profile page is also meaningful', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-05 14:18:11', '2026-02-05 14:18:11'),
(20, 17, '2026-02-05', 'Today,i addressed the hosting issues,discussed that with team,also worked on the job portal project.Additionally, i explored new programming  languages.', '', '2026-02-05 15:08:00', '2026-02-05 15:08:00'),
(21, 18, '2026-02-05', 'built a working model of email agent ', '', '2026-02-05 16:46:48', '2026-02-05 16:46:48'),
(22, 20, '2026-02-05', 'Implemented inline subtask creation within the task list.\r\n\r\nImproved task UI with updated icons, styling, and responsive layout adjustments.\r\n\r\nEnhanced confirmation messages and modal components for better clarity.\r\n\r\nAdded auto-expand behavior for subtasks on initial load.', 'https://github.com/shubhcoding01/attendance_dashboard', '2026-02-05 17:31:57', '2026-02-05 17:31:57'),
(23, 1, '2026-02-06', 'Done integrating the email agent with the CRM, and almost ready to deploy', '', '2026-02-06 12:11:15', '2026-02-06 12:11:15'),
(24, 11, '2026-02-06', 'created about 4 webpages for digital newspaper website ', '', '2026-02-06 12:30:21', '2026-02-06 12:30:21'),
(25, 18, '2026-02-06', 'i have finished working on Email Agent today \r\nand am working on the ui for the crm project now \r\n', '', '2026-02-06 12:38:21', '2026-02-06 12:38:21'),
(26, 14, '2026-02-06', 'Improved job portal with more meaningful candidate dashboard, improved applications page', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-06 12:55:17', '2026-02-06 12:55:17'),
(27, 16, '2026-02-06', 'Checked whether we can incorporate Gmail in CRM or not. Discussed the project structure with Varshith and Paardhiv', '', '2026-02-06 13:01:11', '2026-02-06 13:01:11'),
(28, 21, '2026-02-06', 'Improved the nifty project', '', '2026-02-06 14:03:43', '2026-02-06 14:03:43'),
(29, 17, '2026-02-06', 'Participated in meetings focused on hosting discussions and bug fixing.', '', '2026-02-06 16:33:17', '2026-02-06 16:33:17'),
(30, 16, '2026-02-07', 'Researched whether we can monitor incoming emails or not for CRM project', '', '2026-02-07 11:35:44', '2026-02-07 11:35:44'),
(31, 11, '2026-02-07', 'Worked on digital newspaper website and tested jobportal ', '', '2026-02-07 11:36:03', '2026-02-07 11:36:03'),
(32, 21, '2026-02-07', 'today i worked on the ai interview part improved the current one with improved chatgpt api.', '', '2026-02-07 11:40:29', '2026-02-07 11:40:29'),
(33, 14, '2026-02-07', 'Fixed some bugs that noted by Kruti and started to implement the feature like learning module to fill the skill gap ', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-07 11:44:07', '2026-02-07 11:44:07'),
(34, 1, '2026-02-07', 'Added clients information and had some good progress in crm project. client managment and SaaS for the client is done. ', '', '2026-02-07 11:44:38', '2026-02-07 11:44:38'),
(35, 15, '2026-02-07', 'Working on the AI interview part.', '', '2026-02-07 11:45:28', '2026-02-07 11:45:28'),
(36, 17, '2026-02-07', 't present, I am working on a job portal project', '', '2026-02-07 12:01:07', '2026-02-07 12:01:07'),
(37, 18, '2026-02-09', 'came to end working on the health agent project ', '', '2026-02-09 05:34:04', '2026-02-09 05:34:04'),
(38, 11, '2026-02-09', 'started working on role modules and created features file for that', '', '2026-02-09 12:07:02', '2026-02-09 12:07:02'),
(39, 1, '2026-02-09', 'added whatsapp plugin but came to know its already done', '', '2026-02-09 12:34:53', '2026-02-09 12:34:53'),
(40, 14, '2026-02-09', 'Added career transition AI feature , still need improvements like how can manage if a candidate tries to apply more than one job that didn\'t match their skills', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-09 12:38:13', '2026-02-09 12:38:13'),
(41, 16, '2026-02-09', 'Connected my Mail for AllyTech Queries Section. It could capture the received queries.', '', '2026-02-09 12:43:11', '2026-02-09 12:46:21'),
(42, 15, '2026-02-09', 'Designed the code terminal part in the Ai interview.', '', '2026-02-09 12:48:52', '2026-02-09 12:48:52'),
(43, 21, '2026-02-09', 'Today improved the nifty project and trying to improve the frontend to the best.', '', '2026-02-09 12:52:14', '2026-02-09 12:52:14'),
(44, 17, '2026-02-09', 'Handling login and register module for the new project.  ', '', '2026-02-09 13:05:19', '2026-02-09 13:05:19'),
(45, 11, '2026-02-10', 'worked on user panel for digital newspaper website', '', '2026-02-10 12:20:52', '2026-02-10 12:20:52'),
(46, 21, '2026-02-10', 'worked on the full ui for the nifty project and integrated the zerodha api for the whole project and fetched all the stocks at once and sorting according to the options.', '', '2026-02-10 12:30:49', '2026-02-10 12:47:44'),
(47, 16, '2026-02-10', 'Got assigned to a new task - Employee Management and Project Tracking System. Got familiar to it. Ran it in my system.  ', '', '2026-02-10 12:30:51', '2026-02-10 12:30:51'),
(48, 14, '2026-02-10', 'Try to improve career transition learning session plus I added some other functionalities like adding work experience, education, certifications in candidate profile page and also the recruiter can able to view the full profile of candidate', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-10 12:42:44', '2026-02-10 12:42:44'),
(49, 15, '2026-02-10', 'Got struck in the project , in the examination part and tried to fix the errors and working to rebuit from scratch.', '', '2026-02-10 12:45:35', '2026-02-10 12:45:35'),
(50, 1, '2026-02-10', 'Added OCR to the crm project that can automatically add lead when we capture any visiting card, and updated employee dashboard', '', '2026-02-10 12:55:22', '2026-02-10 12:55:22'),
(51, 18, '2026-02-10', 'added changes to health agent ', 'https://github.com/Paardhu22/health-agent', '2026-02-10 15:29:36', '2026-02-10 15:29:36'),
(52, 10, '2026-02-10', 'Had a discussion about a simple project with Gaurav sir and Pavan Bro, i have followed with the team updates and connected with abhinav sir and discussed regarding Health ai agent project.', '', '2026-02-10 15:32:25', '2026-02-10 15:32:25'),
(53, 17, '2026-02-10', 'Working on editor panel in economic times project.', '', '2026-02-10 15:56:13', '2026-02-10 15:56:13'),
(54, 1, '2026-02-11', 'Ive modified the audio to text project in some good way and had deployed it using railway\r\nive deployed its backend and im getting backend docs but the transformer is not wokring post deployment, will look after that thing soon', 'https://audio-transcriber-production-1bd8.up.railway.app/', '2026-02-11 13:25:14', '2026-02-11 13:25:14'),
(55, 16, '2026-02-11', 'Got information about Jira part in Attendance Dashboard Part from Varshith. Changed the task ID section where it now shows unique ID', '', '2026-02-11 13:37:54', '2026-02-11 13:37:54'),
(56, 14, '2026-02-11', 'I am still working on the Career Transition AI feature. I am facing issues with loading the full course content. I have also implemented a feature that allows candidates to change their target role even after setting it earlier.', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-11 13:38:09', '2026-02-11 13:38:09'),
(57, 15, '2026-02-11', 'Implemented face recognition using YOLO v8 algorithm.', '', '2026-02-11 13:38:18', '2026-02-11 13:38:18'),
(58, 11, '2026-02-11', 'i worked on user panel i have made some changes in ui for page dashboard ,trending, categories, learning hub and finance tool page and have also seed data to the pages dashboard ,trending, categories and provided proper links to footer ', '', '2026-02-11 13:39:54', '2026-02-11 13:39:54'),
(59, 18, '2026-02-11', ' Replaced the wavy lines with an interactive 3D scene\r\nThe Yoga and Exercise pages are now visually distinct with no cross-contamination of content\r\nthe Yoga button is static in purple glow ', '', '2026-02-11 13:41:34', '2026-02-11 13:45:49'),
(60, 17, '2026-02-11', 'I designed and developed a comprehensive Editor CMS featuring a full Article & Media CRUD suite,content Moderation workflow,and intuitive writer\'s portal for publishing,comment section with Status and Action,CRUD operation etc', '', '2026-02-11 13:42:38', '2026-02-11 13:42:38'),
(61, 21, '2026-02-11', 'improvements in the nifty projects like top gainer, top losers, all stocks sorting system more accurate and more reliable. Worked on the api part to reduce the load and caching memory that reduce the load and increasing the performance.', '', '2026-02-11 13:50:06', '2026-02-11 13:50:06'),
(62, 18, '2026-02-12', 'in the existing project i have implement a doctor/yoga instructor panel \r\nwhere register page we should be have an option to register as a doctor/ yoga instructor and once they are done registering , when they login they should be redirected to a appointment panel where they can update the timings they are free at \r\nand yoga instructor and doctor will have different color so its easy to indentify and \r\nthey can select which they are available at and once if they are avaliable it will reflect in Appointments page for the paitents one we have work on for ', '', '2026-02-12 12:53:16', '2026-02-12 12:53:16'),
(63, 15, '2026-02-12', 'Implementing the First rounf part of the Ai interview (Mcqs and coding questions)', '', '2026-02-12 13:02:03', '2026-02-12 13:02:03'),
(64, 1, '2026-02-12', 'Deployed CRM project with all wokring featuers, OCR, Outbounding and inbounding client data, database connection all were set for testing', 'https://crm-sh-1.vercel.app/', '2026-02-12 13:04:06', '2026-02-12 13:04:06'),
(65, 11, '2026-02-12', 'have worked on the pages dashboard to seed data from database and trending page and categories has been connected to database and then worked on dark theme and then learn a tutorial and deploy codigniter website job portal there were some routing issues so made changes to the files for routing', '', '2026-02-12 13:09:41', '2026-02-12 13:09:41'),
(66, 14, '2026-02-12', 'In career transition AI module, used open AI API Key instead of  mistarl Al API key, but still have some issues to fix, involved in fixing issues with Kruthi when deploying the app', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-12 13:18:31', '2026-02-12 13:18:31'),
(67, 16, '2026-02-12', 'Added these features to WorkForce - requests section, tasks, subtasks, new account, modified version of adding a task, user details', '', '2026-02-12 14:02:26', '2026-02-12 14:02:26'),
(68, 21, '2026-02-12', 'worked on the stock price thing in a individual level seraching every stock in the indian stock market and the charts.charts more attractive and interactive.', '', '2026-02-12 14:17:20', '2026-02-12 14:17:20'),
(69, 17, '2026-02-12', 'I\'ve deployed the project; however, there\'s a minor database connectivity issue that I am currently troubleshooting.', '', '2026-02-12 17:41:55', '2026-02-12 17:41:55'),
(70, 14, '2026-02-13', 'Today I implemented some responsive designs in my job portal, PDF download feature for my Career Transition AI, and also working with some multi-language support feature. Also made changes in the deployed portal to work the career transition AI feature without failure. ', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-13 12:42:18', '2026-02-13 12:42:18'),
(71, 1, '2026-02-13', 'I have done the task which is given by haris sir and had a meet wit haris sir and ankit sir regarding the hosting on milesweb, ive watched some of the demo regarding the same', '', '2026-02-13 13:19:08', '2026-02-13 13:19:08'),
(72, 15, '2026-02-13', 'Implmenting the Ai intrview part , faced errors and in reort generation and fixed it.', 'https://docs.google.com/document/d/1wSuqpgVVtlnf7h6PmMk9FotFwIpaVW77Balp6GSbXQ0/edit?usp=sharing', '2026-02-13 13:29:36', '2026-02-13 13:29:36'),
(73, 11, '2026-02-13', 'Worked on ui of the page made changes in \r\nUser panel ui for dark theme in pages dashboard, trending, category, finance, learning hub, ai and added feature so user can like, comment, share and bookmark any article and worked on middleware for no access without login and created for you page with utilizing database \r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-02-13 13:39:47', '2026-02-13 13:39:47'),
(74, 21, '2026-02-13', 'deployed the nifty project and worked on the chart part more to make it more interesting. the errors in the deployment and error in the websockets.', '', '2026-02-13 13:43:14', '2026-02-13 13:43:14'),
(75, 17, '2026-02-13', 'API checks for the project  .Prepared report , and issues found during the site checkout process and resolving.\"', '', '2026-02-13 19:11:29', '2026-02-13 19:11:29'),
(76, 14, '2026-02-14', 'Enabled UI support for multiple regional languages like Tamil, Telugu and Hindi(partially completed), changing the system behavior so that previously generated Career Transition entries are not deleted when a new one is created', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-14 10:49:01', '2026-02-14 10:49:01'),
(77, 11, '2026-02-14', ' Worked on RapidAPI to get the news data and nifty data , for nifty data yahu financial and its working for that created service ', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?tab=t.0', '2026-02-14 11:33:47', '2026-02-14 11:33:47'),
(78, 16, '2026-02-14', 'Changed the UI of the Employee dashboard. Added Login/out time. Corrected the status of the employee in admin dashboard', '', '2026-02-14 11:56:52', '2026-02-14 11:56:52'),
(79, 15, '2026-02-14', 'Tried to implement the coding terminal part using the Monaco code editor, camera access issues has raised fixing up the things', '', '2026-02-14 12:27:44', '2026-02-14 12:27:44'),
(80, 21, '2026-02-14', 'today i improved the error in the backend. api are the main culprit which are causing error and that refresh token problem solution. ', '', '2026-02-14 14:23:01', '2026-02-14 14:23:01'),
(81, 18, '2026-02-14', 'i have made major changes to the ui of the application \r\nmakes changes in landing page \r\nadding a new navigation bar below for easier access which looks cleaner \r\nand its for published due to dB migration issue', '', '2026-02-14 14:57:57', '2026-02-14 14:57:57'),
(82, 1, '2026-02-14', 'Done with some progress regarding haris sir task, and also ive updates some of the transcriber features of lingua voice', '', '2026-02-14 17:56:49', '2026-02-14 17:56:49'),
(83, 17, '2026-02-15', 'Fixing existing issues and building new features', '', '2026-02-15 07:02:44', '2026-02-15 07:02:44'),
(84, 18, '2026-02-16', '\r\n Work Completed Today\r\n### 1.  Video Call System\r\n*   **Real-Time Consultation**: Integrated a fully functional WebRTC video conferencing system using **PeerJS**. \r\n*   **Premium HUD Interface**: Designed a glassmorphic \"Consultation Space\" with:\r\n    *   Live camera and microphone controls.\r\n    *   Dynamic peer connection status (handshake tracking).\r\n    *   Encrypted session indicators and call timers.\r\n    *   Draggable \"Self-View\" window for optimal focus.\r\n*   **Deterministic Routing**: Automated room assignment using `meetingId-role` IDs, allowing patients and doctors to connect instantly without manual links.\r\n### 2. Premium Doctor Experience\r\n*   **Refactored \"Overview\" Dashboard**: Replaced the tabbed interface with a high-fidelity command center featuring Matrix Stats, Growth Indicators, and a \"Live Agenda.\"\r\n*   **Smart Agenda**: Doctors now see a prioritized list of today\'s appointments with direct \"Launch Space\" buttons.\r\n*   **Dedicated Professional Pages**:\r\n    *   **My Patients**: A refined roster for history tracking and chat.\r\n    *   **Availability Manager**: Interactive glassmorphic scheduler with custom time pickers.\r\n    *   **Profile Management**: Professional status and credential display.\r\n### 3. Automated Appointment Workflow\r\n*   **Secure Meeting Generation**: Automatically generates unique encrypted `meetingId` tokens for every confirmed appointment.\r\n*   **Post-Call Synchronization**: Appointments are automatically flagged as `COMPLETED` the moment either party ends the video session, ensuring statistics are always accurate.\r\n*   **Manual Data Recovery**: Created scripts to backfill meeting IDs for legacy appointments to prevent link expiration.\r\n### 4. Technical Stability & Infrastructure\r\n*   **Production Deployment**: Successfully pushed the latest code to GitHub and deployed to Vercel Production.\r\n*   **Build Optimization**: Resolved `.next` cache corruption and ESLint escape entity issues that were blocking production builds.\r\n---\r\n## ðŸ› ï¸ Project Setup Instructions\r\nFollow these steps to get the environment running from scratch:\r\n### 1. Prerequisites\r\n*   **Node.js**: v18.0.0 or higher\r\n*   **Git**: Latest version\r\n*   **PostgreSQL**: A running instance (or a Neon.tech connection string)\r\n### 2. Installation\r\nClone the repository and install dependencies:\r\n```bash\r\ngit clone https://github.com/Paardhu22/health-agent.git\r\ncd health-agent\r\nnpm install --legacy-peer-deps\r\n```\r\n### 3. Environment Variables\r\nCreate a `.env` file in the root directory and add the following:\r\n```env\r\n# Database\r\nDATABASE_URL=\"postgresql://user:password@host/db?sslmode=require\"\r\n# AI (Optional for testing)\r\nOPENAI_API_KEY=\"your_key\"\r\n# Authentication\r\nNEXTAUTH_SECRET=\"your_secret_string\"\r\nNEXTAUTH_URL=\"http://localhost:3000\"\r\n```\r\n### 4. Database Initialization\r\nGenerate the Prisma client and push the schema to your database:\r\n```bash\r\nnpx prisma generate\r\nnpx prisma db push\r\n```\r\n### 5. Running Development\r\nStart the local server:\r\n```bash\r\nnpm run dev\r\n```\r\nThe app will be available at `http://localhost:3000`.\r\n---\r\n## ðŸ’¡ Troubleshooting\r\n*   **\"Cannot find module\" build errors**: Clear the build cache:\r\n    ```bash\r\n    Remove-Item -Recurse -Force .next\r\n    npm install\r\n    npm run dev\r\n    ```\r\n*   **Camera/Mic Not Working**: Ensure you are using `localhost` or an `https` connection. WebRTC requires a secure context.\r\n*   **Prisma Client Issues**: If the database schema changes, always run `npx prisma generate`.', 'https://github.com/Paardhu22/health-agent', '2026-02-16 12:00:55', '2026-02-16 12:00:55'),
(85, 1, '2026-02-16', 'Done deploying event horizon app wtih small modfications and into same domain using milesweb', 'https://event-horizons.allytechcourses.com/', '2026-02-16 12:17:06', '2026-02-16 12:17:06'),
(86, 16, '2026-02-16', 'Changed the UI in Employee Dashboard. Added Dark/Light Mode. Added profile section where user can modify their profile, name, DOJ.\r\n', '', '2026-02-16 12:30:00', '2026-02-16 12:30:00'),
(87, 15, '2026-02-16', 'Working on the AI interview part backend database is connected and setting up the interview system.', '', '2026-02-16 12:47:17', '2026-02-16 12:47:17'),
(88, 11, '2026-02-16', 'changed whole Ui to keep it similar with nifty project and used ytfinance and newsapi to fetch the data and completed the design of dashboard', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-02-16 12:53:19', '2026-02-16 12:53:19'),
(89, 14, '2026-02-16', 'Implemented Career Transition History feature with smart reactivation, working with suggesting jobs for candidate based on skills, apply behaviour ', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-16 12:57:48', '2026-02-16 12:57:48'),
(90, 21, '2026-02-16', 'Implementing terminal part of charts using the treading view in the app.', '', '2026-02-16 15:57:50', '2026-02-16 15:57:50'),
(91, 14, '2026-02-17', 'Merged all job listings with filter options and AI-suggested jobs into one page, making the flow more meaningful.', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-17 11:49:08', '2026-02-17 11:49:08'),
(92, 11, '2026-02-17', ' Created nifty and sensex page using rapid api and \r\nAlso tried to attach media and created full article page \r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-02-17 12:05:50', '2026-02-17 12:05:50'),
(93, 15, '2026-02-17', 'Implemented the pdf parsing in AI interview system handled server.js error ogs.', '', '2026-02-17 12:12:41', '2026-02-17 12:12:41'),
(94, 17, '2026-02-17', 'I\'m working on Google authentication for the Laravel login.', '', '2026-02-17 17:23:00', '2026-02-17 17:23:00'),
(95, 21, '2026-02-18', 'worked on nifty project trying to include the treading view charts in to the project.', '', '2026-02-18 04:31:32', '2026-02-18 04:31:32'),
(96, 11, '2026-02-18', 'Changed ui in login and sign up page try fetched news and display them on page , created pages news,fullartical,news by category and tried to compare and find best api for the features ', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-02-18 12:27:53', '2026-02-18 12:27:53'),
(97, 14, '2026-02-18', 'Updated the stable version in deployed site, and working with merging list all jobs and AI suggested jobs into one page ', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-18 12:29:29', '2026-02-18 12:29:29'),
(98, 1, '2026-02-18', 'DOne the task given by haris sir and working on ai interview part', '', '2026-02-18 12:47:07', '2026-02-18 12:47:07'),
(99, 17, '2026-02-18', 'I encountered some errors with Google authentication, so I proceeded to upload my recent update to the host web portal.', '', '2026-02-18 12:55:48', '2026-02-18 12:55:48'),
(100, 1, '2026-02-19', 'Added code terminal part in ai inerview and made learningpath of speeh to text to add some stories', '', '2026-02-19 12:27:36', '2026-02-19 12:27:36'),
(101, 14, '2026-02-19', 'Changing the UI of entire web application', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-19 12:30:51', '2026-02-19 12:30:51'),
(102, 11, '2026-02-19', ' Try to embed upstox api in the website pages but api tokens will be needed itâ€™ll take some time so today worked on login and registration connescting database , news by category i have added database and also fetched editor posted news along with The api news. \r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-02-19 12:31:25', '2026-02-19 12:31:25'),
(103, 17, '2026-02-19', 'I modify  online application and prepared documents. ', '', '2026-02-19 17:19:47', '2026-02-19 17:19:47'),
(104, 18, '2026-02-20', 'i added changes to the dashboard giving it a new style ', '', '2026-02-20 05:12:41', '2026-02-20 13:21:38'),
(105, 11, '2026-02-20', ' Worked on prediction modle and try to analyse the news', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-02-20 13:21:28', '2026-02-20 13:21:28'),
(106, 15, '2026-02-20', 'Merging the AI examination part and the AI Interview part. Designed the Architecture.', '', '2026-02-20 13:25:59', '2026-02-20 13:25:59'),
(107, 14, '2026-02-20', 'Made AI interview configurable per company/job (Required, Optional, Bypass), and working with the recruiter verification', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-20 13:26:36', '2026-02-20 13:26:36'),
(108, 21, '2026-02-20', 'started the work on the prediction sort of features for nifty these helps beginner with selecting high quality stocks and using ai for smarter execution.', '', '2026-02-20 13:33:09', '2026-02-20 13:33:09'),
(109, 8, '2026-02-21', 'Log Your Achievements\r\nOperational Victories can change to \r\nwhat you worked yesterday\r\nwhat are you working today \r\nwhat are your blockers\r\n\"what it takes to make your goal achievable\" and for \"you , serphawk or who to do\"', '', '2026-02-21 02:40:25', '2026-02-21 02:40:25'),
(110, 14, '2026-02-21', 'Included company profile, recruiter can add or update and the candidate can view the company profile', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-21 11:38:00', '2026-02-21 11:38:00'),
(111, 11, '2026-02-21', 'Worked on a better ui of prediction model and a better logic and also worked on fetching real time news data', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-02-21 11:47:58', '2026-02-21 11:47:58'),
(112, 21, '2026-02-22', 'Improvements on the current project and efficiency and the speed of the project', '', '2026-02-22 17:37:41', '2026-02-22 17:37:41'),
(113, 15, '2026-02-23', 'The Integrating the Ai examination and Ai interview applications.', '', '2026-02-23 12:42:42', '2026-02-23 12:42:42'),
(114, 14, '2026-02-23', 'Implemented candidate â€œContinue with Googleâ€ authentication,  Save Job functionality, recruiter-candidate messaging section, and header notifications with unread tracking. ', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-23 13:03:49', '2026-02-23 13:03:49'),
(115, 11, '2026-02-23', 'Worked on editor panel \r\nDashboard \r\nTotal articles ,\r\nArchived\r\nDrafts\r\nAnd pending\r\nAdd , update delete and \r\nView articles \r\nUpdate and delete article media\r\nSee comments along with user profile\r\nProfile settings\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-02-23 13:05:29', '2026-02-23 13:05:29'),
(116, 21, '2026-02-23', 'i have done the csv sheet downloading part for weekly , monthly and min timeframe for top nifty 500 stocks', '', '2026-02-23 19:12:27', '2026-02-23 19:12:27'),
(117, 18, '2026-02-24', 'i made minor changes to dashboard again and fixed the login auth part', '', '2026-02-24 03:51:16', '2026-02-24 12:50:43'),
(118, 1, '2026-02-24', 'Done pushing all my codes into company\'s github and then done the project execution in Anjali\'s system', 'https://github.com/serphawk22', '2026-02-24 12:43:35', '2026-02-24 12:43:35'),
(119, 14, '2026-02-24', 'changed candidate profile to a single-page, form validation in posting job,  fixed bug in accessing job detail page from landing page, added filter for applicants in recruiter module', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-24 12:45:49', '2026-02-24 12:45:49'),
(120, 11, '2026-02-24', 'Worked on admin panel \r\nUser management page \r\nSearch and filter user \r\nBlock user or see status and activity\r\nContempt management can approve articles or not and can delete them \r\nCategories add new category or subcategory and can deactivate and delete them\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-02-24 12:47:11', '2026-02-24 12:47:11'),
(121, 14, '2026-02-25', 'The stable version updated on deployed site, changed SMS platform from Twilio to Firebase, added feature like recruiter can make notes or tags for each candidate', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-25 12:32:46', '2026-02-25 12:32:46'),
(122, 18, '2026-02-25', 'tried fixing the stun server issue from metered', '', '2026-02-25 12:49:30', '2026-02-25 12:49:30'),
(123, 11, '2026-02-25', 'Worked on features like comment view \r\nApprove \r\nBan user \r\nFiltering comment\r\nReports generation for category and articles \r\nProfile settings \r\nAnd chart for users registration\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-02-25 12:52:28', '2026-02-25 12:52:28'),
(124, 1, '2026-02-25', 'deployed all the projects to allytech domain without actually buying any subscription with existing milesweb accound and it actually worked.\r\ncompleted the task given by haris sir', '', '2026-02-25 12:54:46', '2026-02-25 12:54:46'),
(125, 21, '2026-02-25', 'done the deployment part and fixing many issues in the production. The websocket issue and the chart issue vercel uses UTC but local server uses IST time it created a big mess and chart could not load properly', '', '2026-02-25 13:00:21', '2026-02-25 13:00:21'),
(126, 11, '2026-02-26', 'Worked on upstox api to fetch data and nse website and created company page from where can see particular charts and data about company', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-02-26 12:31:13', '2026-02-26 12:31:13'),
(127, 18, '2026-02-26', 'i have added image gen for workout and yoga for reference', '', '2026-02-26 12:33:45', '2026-02-26 12:33:45'),
(128, 1, '2026-02-26', 'started to work on crm instance', '', '2026-02-26 12:37:21', '2026-02-26 12:37:21'),
(129, 14, '2026-02-26', 'Fixed the overriding issue with success messages for each action, enabled bulk actions like message , shortlist etc. for recruiter, made some changes in UI part of recruiter, and changed some recruiter flow', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-26 12:43:03', '2026-02-26 12:43:03'),
(130, 11, '2026-02-27', 'Worked on company page \r\nTo fetch the particular company data \r\nAnd worked on \r\nUser dashboard\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-02-27 13:06:52', '2026-02-27 13:06:52'),
(131, 21, '2026-02-27', 'make the changes in the charts and add more csv files to download and more features for in the charts and timeframes', '', '2026-02-27 13:07:11', '2026-02-27 13:07:11'),
(132, 14, '2026-02-27', 'added a â€œSearch Candidatesâ€ page for recruiters, job alerts by mail and notification, and also added ATS score\r\n', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-27 13:11:51', '2026-02-27 13:11:51'),
(133, 1, '2026-02-27', 'Done a unique isntance for crm to show for any external person with clean UI, and removed all dummy data and made all the thigs wokring here', '', '2026-02-27 16:22:24', '2026-02-27 16:22:24'),
(134, 14, '2026-02-28', 'Implemented AI resume generation based on role ', 'https://github.com/rinudeepak/ai-job-portal', '2026-02-28 11:27:22', '2026-02-28 11:27:22'),
(135, 11, '2026-02-28', 'user \r\n-dashboard\r\n-watchlist\r\n-my interest\r\n-profile\r\n-comments\r\n-bookmarks\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-02-28 11:29:32', '2026-02-28 11:29:32'),
(136, 18, '2026-02-28', '1. Global Background Adjustment\r\n\r\nAdded a semi-transparent black overlay (â‰ˆ45â€“60% opacity).\r\n\r\nApplied a subtle backdrop blur to soften bright streaks.\r\n\r\nPreserved the original aesthetic while improving contrast for foreground text.\r\n\r\n2. Hero Text Readability\r\n\r\nIntroduced a soft gradient focus behind the headline area.\r\n\r\nIncreased text contrast (closer to pure white).\r\n\r\nAdded subtle text shadow for separation from the background.\r\n\r\nEnsured no harsh rectangular blocks â€” smooth fades only.\r\n\r\n3. Glass Input Card Enhancement\r\n\r\nIncreased card surface opacity (stronger glass base).\r\n\r\nStrengthened backdrop blur for better background diffusion.\r\n\r\nImproved placeholder text contrast.\r\n\r\nMaintained glassmorphism styling (rounded corners, translucency intact).', 'https://github.com/serphawk22/health-yoga-ai-agent-paardhiv', '2026-02-28 11:33:37', '2026-02-28 11:33:37'),
(137, 21, '2026-02-28', 'started building charts for volume vs price for nifty 500 stocks', '', '2026-02-28 15:51:44', '2026-02-28 15:51:44'),
(138, 14, '2026-03-02', 'added reset password, forgot password,  withdraw application option, and changed layout of candidate\'s applications page', 'https://github.com/rinudeepak/ai-job-portal', '2026-03-02 12:38:03', '2026-03-02 12:38:03'),
(139, 11, '2026-03-02', 'Admin \r\nDashboard \r\nDark theme \r\nAdmin \r\neditor \r\nUser (backend)\r\n-my interest\r\n-profile\r\n-saved stocks\r\n-bookmarks\r\nHosting website\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-02 12:51:38', '2026-03-02 12:51:38'),
(140, 18, '2026-03-02', 'security issue fixed', '', '2026-03-02 14:11:22', '2026-03-02 14:11:22'),
(141, 1, '2026-03-02', 'integrating employee dashboard with attendece dashboard', '', '2026-03-02 14:56:45', '2026-03-02 14:56:45'),
(142, 1, '2026-03-03', 'Done with merging both projects, need to deploy it within the week', '', '2026-03-03 12:34:12', '2026-03-03 12:34:12'),
(143, 14, '2026-03-03', 'changes made in AI resume studio and added some company details extra ', 'https://github.com/rinudeepak/ai-job-portal', '2026-03-03 12:34:35', '2026-03-03 12:34:35'),
(144, 11, '2026-03-03', 'After hosting there were \r\nSome bugs in pages\r\nActivity log , my interest and other just fixed that\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-03 12:38:26', '2026-03-03 12:38:26'),
(145, 1, '2026-03-04', 'started the crm updates that i got from excel sheet\r\n', '', '2026-03-04 12:27:00', '2026-03-04 12:27:00'),
(146, 14, '2026-03-04', 'fixed bugs related to role based access to pages, included search and browse companies option for candidates, added review companies  option for candidates', 'https://github.com/rinudeepak/ai-job-portal', '2026-03-04 12:28:44', '2026-03-04 12:28:44'),
(147, 11, '2026-03-05', 'I worked on title and company page to fetch more details and learned wordpress', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-05 11:14:38', '2026-03-05 11:14:38'),
(148, 14, '2026-03-05', 'changes made in company review like interview reviews allowed only for candidates who applied/interviewed, employee reviews allowed only for candidates with a hired/selected', 'https://github.com/rinudeepak/ai-job-portal', '2026-03-05 11:24:32', '2026-03-05 11:24:32'),
(149, 11, '2026-03-06', 'Worked on aiSummary and \r\nHow the news impact us part using openai key\r\nand removed dummy data from database', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-06 12:42:11', '2026-03-06 12:42:11'),
(150, 14, '2026-03-06', 'made some changes in DB, working on candidate suggestions for a specific for recruiters.\r\n\r\n\r\n', 'https://github.com/rinudeepak/ai-job-portal', '2026-03-06 12:56:10', '2026-03-06 12:56:10'),
(151, 14, '2026-03-07', 'Removed old AI part and its references, changed the jobs listing page structure, all changes are made in deployed site also', 'https://github.com/rinudeepak/ai-job-portal', '2026-03-07 12:17:20', '2026-03-07 12:17:20'),
(152, 11, '2026-03-07', 'worked on features\r\n-aisummary\r\n-news impact\r\n-news section\r\n-article section\r\n-multilanguage support \r\nDeployed all features\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-07 12:21:01', '2026-03-07 12:21:01'),
(153, 1, '2026-03-09', 'Got feedback from haris sir regarding the task and updated a lot of client side in the crm', '', '2026-03-09 13:06:35', '2026-03-09 13:06:35'),
(154, 11, '2026-03-09', 'have been worked on sample android application', '', '2026-03-09 13:22:24', '2026-03-09 13:22:24'),
(155, 14, '2026-03-09', 'Tried new technology like flutter, bulid a smart calculator using it', '', '2026-03-09 13:28:51', '2026-03-09 13:28:51'),
(156, 18, '2026-03-09', 'i made notes for gen ai\r\n', '', '2026-03-09 13:32:19', '2026-03-09 13:32:19'),
(157, 1, '2026-03-10', 'Deployed workforce pro, and working on haris sir task', '', '2026-03-10 12:45:06', '2026-03-10 12:45:06'),
(158, 11, '2026-03-10', 'Worked on aichatbot for news website \r\n-site navigation\r\n-market \r\n-stocks\r\n-currency\r\n-gold/silver\r\n-news\r\nItâ€™s answering all these questions\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-10 12:52:47', '2026-03-10 12:52:47'),
(159, 14, '2026-03-10', 'tried new AI tool -WORKIK -to develop notes app, but got some errors, made some modifications in flutter app for smart calculator', '', '2026-03-10 13:03:33', '2026-03-10 13:03:33'),
(160, 18, '2026-03-10', 'all the excel sheet changes were made', '', '2026-03-10 13:18:01', '2026-03-10 13:18:01'),
(161, 18, '2026-03-11', 'learnt about excel \r\nand made notes and prepared for gen ai for todays lecture', '', '2026-03-11 12:31:33', '2026-03-11 12:31:33'),
(162, 11, '2026-03-11', 'Worked on aichatbot for \r\n-editor site navigation\r\n-admin site navigation\r\n-editor add article / ai suggestion\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-11 13:12:37', '2026-03-11 13:12:37'),
(163, 11, '2026-03-12', 'worked on android application for niftynews', '', '2026-03-12 13:31:56', '2026-03-12 13:31:56'),
(164, 1, '2026-03-13', 'Added most of the features from the blueprint in the crm, made the cleint dashboard looks good', '', '2026-03-13 12:04:01', '2026-03-13 12:04:01'),
(165, 11, '2026-03-13', '\r\nWORKED ON NEWS PAGE FOR \r\n-fetching whole article\r\n-share the article\r\n-voice assistant for ai summary \r\nOn company page \r\nQuarterly Financial Results\r\nTechnical Indicators\r\nFundamentals \r\n\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-13 12:38:08', '2026-03-13 12:38:08'),
(166, 14, '2026-03-13', 'change the profile part like after login the candidates are forced to complete the profile , and some changes are made in header search bar, and settings page developed to deal with profile visibility and job alert', 'https://github.com/rinudeepak/ai-job-portal', '2026-03-13 12:39:41', '2026-03-13 12:39:41'),
(167, 14, '2026-03-14', 'included a Job-specific Resume Coach, a Pre-interview Preparation Coach with detailed mock \r\ninterview support, and a Job Search Strategy Coach to guide candidates before and after applying', 'https://github.com/rinudeepak/ai-job-portal', '2026-03-14 11:37:30', '2026-03-14 11:37:30'),
(168, 11, '2026-03-14', 'added prediction model in full article section \r\nfetch data for nifty50,niftybank,niftyit,sensex\r\nai voice assistant enabling all languages', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-14 11:43:04', '2026-03-14 11:43:04'),
(169, 18, '2026-03-15', 'made all changes that were requested', '', '2026-03-15 14:57:01', '2026-03-15 14:57:01'),
(170, 1, '2026-03-16', 'doing updates on the crm and it must be out by this week, addded some of the featuers and making the email agent strong', '', '2026-03-16 11:15:26', '2026-03-16 11:15:26'),
(171, 11, '2026-03-16', 'User dashboard\r\nRecommandation\r\nNotification\r\nDetailed analysis\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-16 11:44:45', '2026-03-16 11:44:45'),
(172, 14, '2026-03-17', 'Trying to change the UI of job portal with a new design ', 'https://github.com/rinudeepak/ai-job-portal', '2026-03-17 11:16:30', '2026-03-17 11:16:30'),
(173, 11, '2026-03-17', 'â€œWhy Market Movedâ€ (Auto Explanation Engine)\r\nAffected stocks\r\nâ€œIf You Investedâ€¦â€ Simulator\r\nGlobal Impact \r\nStrategy Suggestions\r\nLearning Mode for Beginners\r\nExplain news simply:\r\nâ€œIPO oversubscribedâ€ means:\r\nâ†’ More demand than shares available\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-17 11:19:43', '2026-03-17 11:19:43'),
(174, 11, '2026-03-18', 'Made changes in ui and fixed bugs of website ', '', '2026-03-18 11:20:04', '2026-03-18 11:20:04'),
(175, 14, '2026-03-18', 'I am redesigning the UI of my job portal to make it more suitable for a job portal', 'https://github.com/rinudeepak/ai-job-portal', '2026-03-18 11:26:06', '2026-03-18 11:26:06'),
(176, 18, '2026-03-20', 'chatbot improvised', '', '2026-03-20 11:07:25', '2026-03-20 11:07:25'),
(177, 14, '2026-03-20', 'changed all pages to match the new UI', 'https://github.com/rinudeepak/ai-job-portal', '2026-03-20 11:08:23', '2026-03-20 11:08:23'),
(178, 11, '2026-03-20', 'Fixed bugs and hosting problem and hosted website again', '', '2026-03-20 13:50:41', '2026-03-20 13:50:41'),
(179, 14, '2026-03-21', 'changed everything into new UI , tested and updated in deployed site also', 'https://github.com/rinudeepak/ai-job-portal', '2026-03-21 12:24:27', '2026-03-21 12:24:27'),
(180, 11, '2026-03-21', 'Worked on recommendation part today', '', '2026-03-21 13:34:45', '2026-03-21 13:34:45'),
(181, 18, '2026-03-23', 'security fixes and ui fixes and all links updated\r\n', '', '2026-03-23 11:18:29', '2026-03-23 11:18:29'),
(182, 11, '2026-03-23', '\r\nðŸš€ 1. Smart Money Tracker (Very Powerful)\r\nIncludes \r\nðŸ”¥ Most Bought Stocks Today\r\nðŸ’° Highest Delivery Volume\r\nðŸ“ˆ Unusual Volume Stocks\r\nðŸ¦ FII / DII Activity\r\nðŸ“Š 2. Stock vs Sector Performance\r\nShow how a stock performs vs its sector.\r\nðŸ”” 3. Price Alert System\r\nUsers can set alerts like:\r\nðŸ¦ 7. Dividend Tracker\r\nShow upcoming dividends:\r\nUpcoming Dividends\r\n\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-23 11:19:52', '2026-03-23 11:19:52'),
(183, 14, '2026-03-23', 'implemented a review section in recruiter module for reviewing a candidate after interview, made some changes and corrections in UI also', 'https://github.com/rinudeepak/ai-job-portal', '2026-03-23 11:35:41', '2026-03-23 11:35:41'),
(184, 11, '2026-03-24', 'Made changes in UI\r\nTrending News Impact Heatmap\r\nExample:Trending Market Impact Today\r\nIT Sector â†‘\r\nBanking â†“\r\nAuto â†‘\r\nPharma Neutral \r\nEvent Impact Timeline\r\nShow timeline for companies.\r\nExample:\r\nHDFC Bank Timeline\r\nJan 2 â€“ Earnings announced Stock: +4%\r\nJan 5 â€“ RBI regulation news Stock: -2%\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-24 11:22:37', '2026-03-24 11:22:37'),
(185, 14, '2026-03-24', 'Converted many POST operations to AJAX to avoid page reloads for simple actions like applying, withdrawing, and saving/unsave etc.', 'https://github.com/serphawk22/Hirematrix-Rinu', '2026-03-24 11:28:41', '2026-03-24 11:28:41'),
(186, 1, '2026-03-24', 'completed the whole crm and ready to deploy', '', '2026-03-24 11:32:20', '2026-03-24 11:32:20'),
(187, 11, '2026-03-25', 'Added labels for time and price and date in charts for \r\nNifty\r\nSensex\r\nCompanies \r\nAdded some links\r\n \r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-25 11:17:05', '2026-03-25 11:17:05'),
(188, 14, '2026-03-25', 'started working with AI Interview part ', 'https://github.com/serphawk22/Hirematrix-Rinu', '2026-03-25 11:38:28', '2026-03-25 11:38:28'),
(189, 1, '2026-03-25', 'Started working on linguavoice project and the crm is ready to deploy', '', '2026-03-25 11:44:58', '2026-03-25 11:44:58'),
(190, 21, '2026-03-25', 'i fixed some issues in the code and database is facing issues in the connection part trying to fix that ', '', '2026-03-25 12:12:47', '2026-03-25 12:12:47'),
(191, 18, '2026-03-25', 'was reasearching about 3d modeling', '', '2026-03-25 12:24:36', '2026-03-25 12:24:36'),
(192, 14, '2026-03-26', 'Today I continued working with AI interview part with two rounds ', 'https://github.com/serphawk22/Hirematrix-Rinu', '2026-03-26 11:25:32', '2026-03-26 11:25:32'),
(193, 11, '2026-03-26', 'Saved companyâ€™s chart data in database \r\nAnd also saved users ip browser device country in database\r\nAnd time each page is taking to load\r\n', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-26 11:29:22', '2026-03-26 11:29:22'),
(194, 11, '2026-03-27', 'Added analytics page in admin dashboard to display information\r\nVisitedpage\r\nLoad time\r\nApi calls\r\nBrowser\r\nuser/guestusers\r\nDevice\r\nip', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-27 11:26:19', '2026-03-27 11:26:19'),
(195, 14, '2026-03-27', 'I implemented an admin dashboard to track daily user count, API calls, cost consumption, and first-page login duration per user. I also populated the portal with 100 jobs from a public source and enhanced the existing Google login by capturing usersâ€™ names and profile pictures in the session.', 'https://github.com/serphawk22/Hirematrix-Rinu', '2026-03-27 11:48:31', '2026-03-27 11:48:31'),
(196, 11, '2026-03-28', 'Deployed the features on hosted website and was having issues while deploying so solved it \r\nAdded analytics page in admin dashboard to display information\r\nVisitedpage\r\nLoad time\r\nApi calls\r\nBrowser\r\nuser/guestusers\r\nDevice\r\nip', 'https://docs.google.com/document/d/1us8AYJZEyGo8FkmBTrGzwmlItD_qokvsb357YPi66vE/edit?usp=sharing', '2026-03-28 11:14:45', '2026-03-28 11:14:45'),
(197, 14, '2026-03-28', 'I implemented a review section in the recruiter module to evaluate candidates after interviews and made several UI improvements and corrections in AI interview part . Also I created a basic HTML page showcasing the portalâ€™s features as a trailer.', 'https://github.com/serphawk22/Hirematrix-Rinu', '2026-03-28 11:32:22', '2026-03-28 11:32:22');

-- --------------------------------------------------------

--
-- Table structure for table `team_pulse`
--

CREATE TABLE `team_pulse` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `mood` enum('fire','okay','tired') NOT NULL,
  `entry_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `team_pulse`
--

INSERT INTO `team_pulse` (`id`, `user_id`, `mood`, `entry_date`, `created_at`) VALUES
(1, 1, 'fire', '2026-02-02', '2026-02-02 13:06:37'),
(2, 8, 'tired', '2026-02-03', '2026-02-03 08:57:52'),
(3, 1, 'fire', '2026-02-03', '2026-02-03 08:59:09'),
(4, 13, 'fire', '2026-02-03', '2026-02-03 12:42:55'),
(5, 16, 'fire', '2026-02-03', '2026-02-03 12:45:38'),
(6, 18, 'fire', '2026-02-03', '2026-02-03 17:12:24'),
(7, 1, 'fire', '2026-02-04', '2026-02-04 05:09:19'),
(8, 18, 'tired', '2026-02-04', '2026-02-04 09:03:39'),
(9, 16, 'fire', '2026-02-04', '2026-02-04 13:25:28'),
(10, 1, 'fire', '2026-02-05', '2026-02-05 07:02:17'),
(11, 8, 'fire', '2026-02-05', '2026-02-05 07:40:48'),
(12, 16, 'okay', '2026-02-05', '2026-02-05 11:05:51'),
(13, 18, 'fire', '2026-02-05', '2026-02-05 11:23:20'),
(14, 1, 'okay', '2026-02-06', '2026-02-06 12:10:43'),
(15, 18, 'tired', '2026-02-06', '2026-02-06 12:40:04'),
(16, 16, 'tired', '2026-02-06', '2026-02-06 13:00:50'),
(17, 16, 'tired', '2026-02-07', '2026-02-07 11:33:51'),
(18, 16, 'okay', '2026-02-08', '2026-02-08 16:19:53'),
(19, 18, 'tired', '2026-02-09', '2026-02-09 05:32:38'),
(20, 16, 'fire', '2026-02-09', '2026-02-09 12:35:08'),
(21, 16, 'tired', '2026-02-10', '2026-02-10 12:48:12'),
(22, 1, 'fire', '2026-02-10', '2026-02-10 13:02:26'),
(23, 18, 'tired', '2026-02-10', '2026-02-10 15:28:35'),
(24, 16, 'tired', '2026-02-11', '2026-02-11 13:36:20'),
(25, 18, 'okay', '2026-02-11', '2026-02-11 13:49:43'),
(26, 18, 'okay', '2026-02-12', '2026-02-12 12:50:47'),
(27, 16, 'okay', '2026-02-12', '2026-02-12 13:21:19'),
(28, 16, 'tired', '2026-02-14', '2026-02-14 11:42:43'),
(29, 18, 'tired', '2026-02-14', '2026-02-14 14:56:26'),
(30, 18, 'tired', '2026-02-15', '2026-02-15 13:31:34'),
(31, 16, 'okay', '2026-02-16', '2026-02-16 05:14:08'),
(32, 18, 'okay', '2026-02-16', '2026-02-16 11:53:11'),
(33, 18, 'tired', '2026-02-17', '2026-02-17 17:07:58'),
(34, 16, 'tired', '2026-02-18', '2026-02-18 14:46:10'),
(35, 16, 'okay', '2026-02-19', '2026-02-19 16:46:33'),
(36, 16, 'fire', '2026-02-20', '2026-02-20 13:19:58'),
(37, 16, 'okay', '2026-02-21', '2026-02-21 11:49:06'),
(38, 16, 'fire', '2026-02-22', '2026-02-22 17:56:25'),
(39, 16, 'okay', '2026-02-24', '2026-02-24 12:43:04'),
(40, 18, 'tired', '2026-02-25', '2026-02-25 12:49:12'),
(41, 16, 'tired', '2026-02-26', '2026-02-26 17:00:48'),
(42, 16, 'okay', '2026-02-28', '2026-02-28 11:25:16'),
(43, 16, 'okay', '2026-03-01', '2026-03-01 17:55:42'),
(44, 16, 'okay', '2026-03-02', '2026-03-02 12:51:27'),
(45, 16, 'tired', '2026-03-03', '2026-03-03 12:35:02'),
(46, 16, 'fire', '2026-03-04', '2026-03-04 12:26:27'),
(47, 16, 'tired', '2026-03-05', '2026-03-05 11:17:16'),
(48, 16, 'okay', '2026-03-10', '2026-03-10 13:08:37'),
(49, 18, 'tired', '2026-03-11', '2026-03-11 12:31:48'),
(50, 16, 'tired', '2026-03-14', '2026-03-14 12:18:44'),
(51, 18, 'okay', '2026-03-15', '2026-03-15 15:02:32'),
(52, 16, 'tired', '2026-03-18', '2026-03-18 12:00:38'),
(53, 16, 'tired', '2026-03-19', '2026-03-19 14:05:58'),
(54, 16, 'okay', '2026-03-20', '2026-03-20 16:01:59'),
(55, 16, 'tired', '2026-03-23', '2026-03-23 11:24:38'),
(56, 16, 'tired', '2026-03-27', '2026-03-27 11:49:59'),
(57, 16, 'fire', '2026-03-28', '2026-03-28 13:01:10'),
(60, 16, 'fire', '2026-03-29', '2026-03-29 17:15:15');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','intern') DEFAULT 'intern',
  `status` enum('pending','approved','rejected') DEFAULT 'approved',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `username`, `password`, `role`, `status`, `created_at`) VALUES
(1, 'Varshith', 'varshith@serphawk.com', '$2y$10$QWhHUyCjgbg6xizdQkM3..Uy7kzAb9v15VCHHN4rbfD/9KYQahtXi', 'admin', 'approved', '2026-02-02 07:31:55'),
(8, 'Brajesh kumar ', 'brajesh.kumar@serphawk.com', '$2y$10$bgWV81WS5V7liWC4mPtp6eNJ0c2suQaG29D48X8I8/.4I44sXXYOa', 'admin', 'approved', '2026-02-03 08:55:04'),
(10, 'Anjali', 'vkanjali@serphawk.com', '$2y$10$.BSavix53/dNt67Nm8X35.4BgDEhbIZlZCKANCiJM6nZz.FtRORkm', 'admin', 'approved', '2026-02-03 12:37:22'),
(11, 'Kruti jadav', 'krutipankajkumar@gmail.com', '$2y$10$RVGfiw.c9Z0mhcV9n7Gk5ueU0A.bQq8XOCzHiPNW3dfCp7Zlx98hK', 'intern', 'approved', '2026-02-03 12:38:15'),
(12, 'vijay', 'lvijay1720@gmail.com', '$2y$10$iYa2GRfxvAz3ONUiJ2K/Ou7PWhZ8D/y2w1NEBYYbgtZJvRLG.1fJW', 'intern', '', '2026-02-03 12:38:43'),
(13, 'Sai Varsha', 'saivarshadewvoju@gmail.com', '$2y$10$iJEeL9dEHZ37y3NBs2oSD.2xvLL2IXxx0Zz5Iq1IWGbqQ9vB9Nt4i', 'intern', '', '2026-02-03 12:39:59'),
(14, 'Rinu George', 'rinu@serphawk.com', '$2y$10$38JVtpLa6AX1HApDIPMkx.RAmu3i0xnqZb2/E5lUaKjq5XOfYYlLS', 'intern', 'approved', '2026-02-03 12:42:30'),
(15, 'Varun Bale', 'varunbale123@gmail.com', '$2y$10$rtv5BRyWGEWHIjLueF9zB.Dw1SlM/viZlqiDammvgIO9jwYzNOISy', 'intern', 'approved', '2026-02-03 12:42:56'),
(16, 'Sai Varsha', 'saivarshadevoju@gmail.com', '$2y$10$B8eVZC3a3YUOB9dIFlzb7uCszNU.3YDbXQ5xfb6kRALxCxmKSMpLC', 'intern', 'approved', '2026-02-03 12:44:29'),
(17, 'syama s murali', 's.syamaabhi@gmail.com', '$2y$10$5/6ITniBWpRh5OGafDkR1.bq6FU7NXw3tai8zclFqiOTBXzXNcG/G', 'intern', '', '2026-02-03 12:45:43'),
(18, 'Paardhiv Reddy Tumma', 'paardhivreddy22@gmail.com', '$2y$10$bDN3Q845Pv1DjbgFOVznQebRQ4YiQaxZX954cFQ1f4Wooo/8Ui0nO', 'intern', 'approved', '2026-02-03 14:53:19'),
(19, 'Lakshman', 'lakshman@serphawk.com', '$2y$10$69m3n4GZMVInz.jHI/pKJ.fcCnNpbn6c4V84tYUHXZ6MDSuSquLgS', 'intern', 'approved', '2026-02-03 17:07:53'),
(20, 'Shubham Raj', 'secureshubhdev@gmail.com', '$2y$10$P/wuiV0nFQXV33TZNZAiMeYOHoX6dvM2BNumFEh7CWRONFNLRFsAu', 'intern', '', '2026-02-04 05:03:00'),
(21, 'vijay', 'lakadapuramvijayendar2005@gmail.com', '$2y$10$NO91MzF.eOasDYOUj4ihRerzRc0Ex6WFro5I844YEFV.I1O1MqoIq', 'intern', 'approved', '2026-02-04 13:58:22'),
(22, 'N B Rachana', 'nbrachana26@gmail.com', '$2y$10$hJ6.bcodPN2IgQFw2IMI0eedQDTRLmm4bpseQxn/ilXL7gpPAH8wm', 'intern', 'approved', '2026-03-25 11:50:55'),
(23, 'Admin', 'admin@gmail.com', '$2y$10$.Yviti3YmOe6sRoh0rpOCukKu8/JKNre62kbb6MvLK/3zCt1nV/Si', 'intern', 'approved', '2026-03-26 15:54:15');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `blogs`
--
ALTER TABLE `blogs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `broadcast_messages`
--
ALTER TABLE `broadcast_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `dream_projects`
--
ALTER TABLE `dream_projects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_dream` (`user_id`);

--
-- Indexes for table `employee_profiles`
--
ALTER TABLE `employee_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `games`
--
ALTER TABLE `games`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `happy_sheet`
--
ALTER TABLE `happy_sheet`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `learning_goals`
--
ALTER TABLE `learning_goals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_goal` (`user_id`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `project_members`
--
ALTER TABLE `project_members`
  ADD PRIMARY KEY (`project_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `team_pulse`
--
ALTER TABLE `team_pulse`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_daily_vote` (`user_id`,`entry_date`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `blogs`
--
ALTER TABLE `blogs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `broadcast_messages`
--
ALTER TABLE `broadcast_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `dream_projects`
--
ALTER TABLE `dream_projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `employee_profiles`
--
ALTER TABLE `employee_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `happy_sheet`
--
ALTER TABLE `happy_sheet`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=390;

--
-- AUTO_INCREMENT for table `learning_goals`
--
ALTER TABLE `learning_goals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=198;

--
-- AUTO_INCREMENT for table `team_pulse`
--
ALTER TABLE `team_pulse`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `announcements`
--
ALTER TABLE `announcements`
  ADD CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `blogs`
--
ALTER TABLE `blogs`
  ADD CONSTRAINT `blogs_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `broadcast_messages`
--
ALTER TABLE `broadcast_messages`
  ADD CONSTRAINT `broadcast_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `dream_projects`
--
ALTER TABLE `dream_projects`
  ADD CONSTRAINT `dream_projects_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employee_profiles`
--
ALTER TABLE `employee_profiles`
  ADD CONSTRAINT `employee_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `happy_sheet`
--
ALTER TABLE `happy_sheet`
  ADD CONSTRAINT `happy_sheet_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `learning_goals`
--
ALTER TABLE `learning_goals`
  ADD CONSTRAINT `learning_goals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `project_members`
--
ALTER TABLE `project_members`
  ADD CONSTRAINT `project_members_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `project_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `team_pulse`
--
ALTER TABLE `team_pulse`
  ADD CONSTRAINT `team_pulse_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
