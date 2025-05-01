-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : mer. 30 avr. 2025 à 22:31
-- Version du serveur : 10.4.27-MariaDB
-- Version de PHP : 8.2.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `vente`
--

-- --------------------------------------------------------

--
-- Structure de la table `audit_vente`
--

CREATE TABLE `audit_vente` (
  `audit_vente_id` int(11) NOT NULL,
  `type_operation` varchar(50) NOT NULL,
  `date_operation` timestamp NOT NULL DEFAULT current_timestamp(),
  `nom_utilisateur` varchar(100) DEFAULT NULL,
  `nom` varchar(255) DEFAULT NULL,
  `design` varchar(255) DEFAULT NULL,
  `qtesortie_ancien` int(11) DEFAULT NULL,
  `qtesortie_nouv` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `audit_vente`
--

INSERT INTO `audit_vente` (`audit_vente_id`, `type_operation`, `date_operation`, `nom_utilisateur`, `nom`, `design`, `qtesortie_ancien`, `qtesortie_nouv`) VALUES
(3, 'modification', '2025-04-30 18:07:32', NULL, 'Clavier mécanique', 'Souris gamer', 25, 50),
(5, 'ajout', '2025-04-30 18:35:41', NULL, 'Paterne', NULL, NULL, NULL),
(6, 'modification', '2025-04-30 18:39:00', NULL, 'Paterne -> XXXX', NULL, NULL, NULL),
(8, 'modification', '2025-04-30 18:47:40', NULL, NULL, 'clavier -> clavier', 2, 2),
(9, 'modification', '2025-04-30 18:48:29', NULL, NULL, 'clavier -> Clavier visuel', 2, 2),
(10, 'suppression', '2025-04-30 18:54:29', NULL, 'XXXX', NULL, NULL, NULL),
(12, 'ajout_vente', '2025-04-30 19:34:22', NULL, 'Randria Rabe', 'Test mécanique', NULL, 20),
(14, 'ajout_vente', '2025-04-30 19:35:47', NULL, 'Rojo Alova', 'Test mécanique', NULL, 20),
(15, 'ajout_vente', '2025-04-30 19:35:50', NULL, 'Rojo Alova', 'Test mécanique', NULL, 20),
(16, 'ajout_vente', '2025-04-30 19:37:18', NULL, 'Rojo Alova', 'Coucou', NULL, 5),
(17, 'suppression_vente', '2025-04-30 20:26:51', NULL, 'Rojo Alova', 'Coucou', NULL, 10);

-- --------------------------------------------------------

--
-- Structure de la table `client`
--

CREATE TABLE `client` (
  `num_client` int(10) NOT NULL,
  `nom` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `client`
--

INSERT INTO `client` (`num_client`, `nom`) VALUES
(1, 'Rojo ah'),
(2, 'Rojo Alova'),
(3, 'Randria Rabe'),
(4, 'Manarivo');

-- --------------------------------------------------------

--
-- Structure de la table `produit`
--

CREATE TABLE `produit` (
  `num_produit` int(10) NOT NULL,
  `design` varchar(50) NOT NULL,
  `stock` int(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `produit`
--

INSERT INTO `produit` (`num_produit`, `design`, `stock`) VALUES
(1, 'Clavier visuel', 2),
(2, 'Coucou', 29),
(5, 'Test mécanique', 170);

-- --------------------------------------------------------

--
-- Structure de la table `ventes`
--

CREATE TABLE `ventes` (
  `num_vente` int(10) NOT NULL,
  `num_client` int(10) NOT NULL,
  `num_produit` int(10) NOT NULL,
  `quantite_sortie` int(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `ventes`
--

INSERT INTO `ventes` (`num_vente`, `num_client`, `num_produit`, `quantite_sortie`) VALUES
(1, 2, 2, 10),
(3, 2, 2, 10),
(4, 2, 2, 5);

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `audit_vente`
--
ALTER TABLE `audit_vente`
  ADD PRIMARY KEY (`audit_vente_id`);

--
-- Index pour la table `client`
--
ALTER TABLE `client`
  ADD PRIMARY KEY (`num_client`);

--
-- Index pour la table `produit`
--
ALTER TABLE `produit`
  ADD PRIMARY KEY (`num_produit`);

--
-- Index pour la table `ventes`
--
ALTER TABLE `ventes`
  ADD PRIMARY KEY (`num_vente`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `audit_vente`
--
ALTER TABLE `audit_vente`
  MODIFY `audit_vente_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT pour la table `ventes`
--
ALTER TABLE `ventes`
  MODIFY `num_vente` int(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
