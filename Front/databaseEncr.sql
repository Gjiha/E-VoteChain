-- Adminer 5.4.2 PostgreSQL 17.8 dump

\connect "evote";

DROP TABLE IF EXISTS "utenti";

CREATE TABLE "public"."utenti" (
    "id_wallet" integer DEFAULT nextval('utenti_id_wallet_seq') NOT NULL,
    "nome" character varying(50) NOT NULL,
    "cognome" character varying(50) NOT NULL,
    "email" character varying(100) NOT NULL,
    "classe" character varying(10),
    "data_di_nascita" date,
    "psw" character varying(100),
    "quota" numeric(10,2),
    CONSTRAINT "utenti_pkey" PRIMARY KEY ("id_wallet"),
    CONSTRAINT "utenti_classe_check" CHECK (((classe)::text = ANY (ARRAY[('CEO'::character varying)::text, ('membro'::character varying)::text])))
);

CREATE UNIQUE INDEX utenti_email_key ON public.utenti USING btree (email);

INSERT INTO "utenti" ("id_wallet", "nome", "cognome", "email", "classe", "data_di_nascita", "psw", "quota") VALUES
(1,	'Maurizio',	'Talamo',	'luca.bianchi@example.com',	'CEO',	'1985-03-12',	'$2b$10$OfAgiWWvn/AGelYJdHxgHuXk9iVnuEME35N8uhBbWgF3bDOKHxts.',	10.99),
(2,	'Giulia',	'Rossi',	'giulia.rossi@example.com',	'membro',	'1990-06-25',	'$2b$10$m2J6mJs3ZcE.fvFyICZ9WO649Z5BNddStVdqFJCS/MQnu95mB9fiq',	1.50),
(3,	'Marco',	'Verdi',	'marco.verdi@example.com',	'membro',	'1988-09-02',	'$2b$10$zE2mFsnUA2K6fCDBLTJCY.nm8VoEHTh8ySeotsqcEPBYtrKNTR1cu',	2.00),
(4,	'Sara',	'Neri',	'sara.neri@example.com',	'membro',	'1995-11-19',	'$2b$10$qTb0VKR97nU8Wi7Jhk/Dou/UT2Xr3EQz9zXMSoR5qxy4BMaYHUGGO',	1.75),
(5,	'Franco',	'Arcieri',	'andrea.costa@example.com',	'CEO',	'1980-02-07',	'$2b$10$bZl/hSPHHXLoiO.E3XmFX.Ih8th/9JIrTVqttpHRjlpRrjKTnX8VG',	10.00),
(6,	'Marta',	'Gallo',	'marta.gallo@example.com',	'membro',	'1993-04-14',	'$2b$10$hM2btpcVBimPBmSdanN6UOsnLL6MuGxRxkWvb2ZhWuWh1T/aCspJq',	1.00),
(7,	'Davide',	'Romano',	'davide.romano@example.com',	'membro',	'1989-12-10',	'$2b$10$65CzvcpWrmj7HOKFyLQWv.vEF6JPPwlTUkkXv0bbkRoSP/3sD5Yb.',	2.50),
(8,	'Chiara',	'Leone',	'chiara.leone@example.com',	'membro',	'1994-05-08',	'$2b$10$swILyxn3dQwgKeTMpeSmgu53CeoExW0iXlHJCEjAsS5hAjMWQIsOW',	1.00),
(9,	'Francesco',	'Cosciotti',	'elena.russo@example.com',	'CEO',	'1983-08-27',	'$2b$10$19kCv.kJB8nQ4B3/JCobCuRA/v4J6KCrh.k4jbMtrFZKIn3K12Vue',	10.00),
(10,	'Francesco',	'Marini',	'francesco.marini@example.com',	'membro',	'1992-07-23',	'$2b$10$KmYRcC.7gJsrsgGec7dsuuuOmyxqTDnCy.jeNEgeqqVcsIJUBWgTy',	1.25),
(11,	'Paolo',	'Fontana',	'paolo.fontana@example.com',	'membro',	'1991-01-17',	'$2b$10$0ME25VYiXAFTNQ3BG4BSTe9bMGgW6.2HyQjt0Ss0oPsHpbNwy8gAK',	1.00),
(12,	'Alessia',	'Greco',	'alessia.greco@example.com',	'membro',	'1996-09-05',	'$2b$10$ou/oN1iBhY6oeGCJlCZOjOBxYOfQsS7PyeTf6wN57BYrcnS3gf2n.',	1.00),
(13,	'Mario',	'Chiappini',	'simone.conti@example.com',	'CEO',	'1982-10-11',	'$2b$10$cMmA6hTvFLkaLZOgLXZL2.Zf1L2w7mSsz1lPBWvesSm4K85ClOY9.',	8.70),
(14,	'Federica',	'Riva',	'federica.riva@example.com',	'membro',	'1997-12-01',	'$2b$10$DBDXBMmZn5GzPaN5Z5khCOWinoJS4TbWxPza4d6EQipDE/ITKPzDe',	1.00),
(15,	'Matteo',	'Moretti',	'matteo.moretti@example.com',	'membro',	'1990-03-15',	'$2b$10$48MgQTQSRZ5FAy5FGbd81e9mOUBHVym16M/.b96kSKsGrsv496ggW',	1.00),
(16,	'Valentina',	'Serra',	'valentina.serra@example.com',	'membro',	'1995-06-09',	'$2b$10$77.cEeG3ioB1KxOAbxLmDuHsXfmk.j3rQ2Bcwe2r.bwMH8nX2czOa',	1.80),
(17,	'Nicola',	'Ferrari',	'nicola.ferrari@example.com',	'membro',	'1987-11-04',	'$2b$10$cJr6/SmnF8fCYhD62Bv2NujtPjASzFseMK3aOaU/mlFHNbmW/Ozzy',	2.00),
(18,	'Laura',	'De Luca',	'laura.deluca@example.com',	'membro',	'1993-02-20',	'$2b$10$oIV8iw/LE87Y.H1QDkT4LeqY4bHGdfBBKgm51Fc38DHwNT5JWcoaG',	1.50),
(19,	'Giorgio',	'Testa',	'giorgio.testa@example.com',	'membro',	'1986-05-27',	'$2b$10$aY9sBkp3xWhnRjQPAzAPSOkfAwg2lm8E.clg0lHseY2Jx7PDA4x7e',	1.00),
(20,	'Silvia',	'Martini',	'silvia.martini@example.com',	'membro',	'1994-08-30',	'$2b$10$Gm0mgSSAh9dgbvQxZiefnO18lPKp3gcDWeUfOAqBdYTd9zm302xQG',	1.80),
(21,	'Riccardo',	'Fabbri',	'riccardo.fabbri@example.com',	'membro',	'1991-07-22',	'$2b$10$483dF0amQbK.ASa58JnJ1eel7GSDwwseSIS0w2rxp/qPcgFawj8KK',	1.00),
(22,	'Alice',	'Barbieri',	'alice.barbieri@example.com',	'membro',	'1998-09-03',	'$2b$10$LU7HyEKzNOpmMk/NVw2wxOy6c7C1hyUIToHmviDz271xMOy/Duur6',	1.00),
(23,	'Stefano',	'Giordano',	'stefano.giordano@example.com',	'membro',	'1989-12-12',	'$2b$10$7phwTMxUYJM0o0Ft24E0WOWYqVLwcjJoqumro.NH1HH2HB8mdf9J2',	1.75),
(24,	'Chiara',	'Bruno',	'chiara.bruno@example.com',	'membro',	'1992-11-15',	'$2b$10$s39qCR0hNMyfh0U.eYC8CucgV.IS.fNyRU1qySjZVNBjEq3ssqTNe',	1.00),
(25,	'Lorenzo',	'Gatti',	'lorenzo.gatti@example.com',	'membro',	'1985-04-28',	'$2b$10$q9iFTRwL.sA64oE9UT.AbOcHnbXLJHzpkMgOPRl/sRwc5BPQroNy6',	1.00),
(26,	'Beatrice',	'Palmieri',	'beatrice.palmieri@example.com',	'membro',	'1996-03-21',	'$2b$10$yL35NHKMmymiZrEunxAeQu16MBt4k70q15e0oCk7qXUrBFqsApt0O',	1.40),
(27,	'Tommaso',	'Grassi',	'tommaso.grassi@example.com',	'membro',	'1993-10-18',	'$2b$10$l9lhiS7MaWNmhC323XaNb.ziD3G16E5/UnbhkILpvrLUK4aMZOZVe',	1.00),
(28,	'Giada',	'Longo',	'giada.longo@example.com',	'membro',	'1997-01-24',	'$2b$10$UY7oloZo9IBSyO6prPKr0O5jZxfMxO97idM5de1w1jBoWbXLIAl4m',	1.50),
(29,	'Christian',	'Sfeir',	'emanuele.parisi@example.com',	'CEO',	'1984-06-06',	'$2b$10$8LLlBuE87yP0tGXI6FHA/eUOGMo/Y.3BhTktV6iyv7tbKnB7v5Wji',	10.00),
(30,	'Roberta',	'Villa',	'roberta.villa@example.com',	'membro',	'1995-09-14',	'$2b$10$DcpSKeIkb6I45Zmob48kbu3C8I1reCBEKspbuKvH4A5xwikBAvqgi',	1.00);

-- 2026-02-27 21:10:45 UTC
