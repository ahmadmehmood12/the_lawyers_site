<?php

/**
 * District & Sessions Judges of Punjab and where they sit, from the Lahore High Court
 * "List of District and Sessions Judges" (dated 23-11-2026). Used by PunjabDistrictSessionsJudgesSeeder.
 *
 * Only the name and present posting are kept (no date of birth, domicile, Bar/Service quota, joining,
 * promotion or retirement dates). Left out: officers posted as O.S.D (incl. LPR), Registrars and
 * Senior Additional Registrars, Directors General of the Lahore High Court, the Punjab Judicial Academy
 * director and officers on judicial service at the Islamabad High Court — none of them sit in a court.
 *
 * Row: [name, district, forum, courtroom (court number, null = only one), role (null = Judge)].
 * Forums and roles are defined in the seeder.
 *
 * @var list<array{0: string, 1: string, 2: string, 3: string|null, 4: string|null}>
 */
return [
    // Sessions divisions (the district's own D&SJ)
    ['Malik Ali Zulqarnain Awan', 'Attock', 'sessions', null, null],
    ['Nasir Hussain', 'Bahawalnagar', 'sessions', null, null],
    ['Muhammad Naeem Saleem', 'Bahawalpur', 'sessions', null, null],
    ['Rehan Bashir', 'Bhakkar', 'sessions', null, null],
    ['Naseem Ahmad Virk', 'Chakwal', 'sessions', null, null],
    ['Muhammad Naeem Sheikh', 'Chiniot', 'sessions', null, null],
    ['Muhammad Ata Rabbani', 'Dera Ghazi Khan', 'sessions', null, null],
    ['Faiz-ul-Hassan', 'Faisalabad', 'sessions', null, null],
    ['Nadeem Tahir Syed', 'Gujranwala', 'sessions', null, null],
    ['Israr Zada', 'Gujrat', 'sessions', null, null],
    ['Ali Nawaz', 'Hafizabad', 'sessions', null, null],
    ['Zafar Iqbal Tarar', 'Jhang', 'sessions', null, null],
    ['Gulzar Ahmad Khalid', 'Jhelum', 'sessions', null, null],
    ['Ahmad Nawaz Khan', 'Kasur', 'sessions', null, null],
    ['Khalid Saeed Wattoo', 'Khanewal', 'sessions', null, null],
    ['Arif Mahmood Khan', 'Khushab', 'sessions', null, null],
    ['Tariq Khurshid Khawaja', 'Lahore', 'sessions', null, null],
    ['Zulfeqar Ali', 'Layyah', 'sessions', null, null],
    ['Muhammad Asif Rana', 'Lodhran', 'sessions', null, null],
    ['Amer Saleem Rana', 'Mandi Bahauddin', 'sessions', null, null],
    ['Aurangzeb', 'Mianwali', 'sessions', null, null],
    ['Muhammad Arshad Anjum', 'Multan', 'sessions', null, null],
    ['Jaleel Ahmad', 'Muzaffargarh', 'sessions', null, null],
    ['Naveed Anjum Saleemi', 'Nankana Sahib', 'sessions', null, null],
    ['Muhammad Arif Hameed Sheikh', 'Narowal', 'sessions', null, null],
    ['Muhammad Nadeem Shaukat', 'Okara', 'sessions', null, null],
    ['Muhammad Ali', 'Pakpattan', 'sessions', null, null],
    ['Izhar-ul-Haq', 'Rahim Yar Khan', 'sessions', null, null],
    ['Muhammad Azam Rana', 'Rajanpur', 'sessions', null, null],
    ['Syed Asghar Ali', 'Rawalpindi', 'sessions', null, null],
    ['Muhammad Faisal Ahmad', 'Sahiwal', 'sessions', null, null],
    ['Muhammad Ijaz-ur-Rehman', 'Sargodha', 'sessions', null, null],
    ['Abid Hussain', 'Sheikhupura', 'sessions', null, null],
    ['Muhammad Arshad Javed', 'Sialkot', 'sessions', null, null],
    ['Syed Ali Imran', 'Toba Tek Singh', 'sessions', null, null],
    ['Muhammad Abbas', 'Vehari', 'sessions', null, null],

    // Punjab Labour Courts
    ['Ms. Jazeela Aslam', 'Lahore', 'labour', 'I', 'presiding_officer'],
    ['Arshad Hussain Bhutta', 'Lahore', 'labour', 'III (Ferozewala)', 'presiding_officer'],
    ['Ch. Muhammad Ilyas', 'Faisalabad', 'labour', 'IV', 'presiding_officer'],
    ['Tariq Javed', 'Sargodha', 'labour', 'V', 'presiding_officer'],
    ['Raja Ghazanfar Ali Khan', 'Rawalpindi', 'labour', 'VI', 'presiding_officer'],
    ['Ms. Shahida Saeed', 'Gujranwala', 'labour', 'VII', 'presiding_officer'],
    ['Ghulam Hussain', 'Bahawalpur', 'labour', 'VIII', 'presiding_officer'],
    ['Wajahat Hasan', 'Multan', 'labour', 'IX', 'presiding_officer'],
    ['Khalid Arshad', 'Sahiwal', 'labour', 'X', 'presiding_officer'],
    ['Ejaz Ahmad Buttar', 'Dera Ghazi Khan', 'labour', 'XI', 'presiding_officer'],

    // Anti-Corruption Courts
    ['Qaiser Nazir Butt', 'Faisalabad', 'anti_corruption', null, 'special_judge'],
    ['Syed Dawar Zafar Ali', 'Sargodha', 'anti_corruption', null, 'special_judge'],
    ['Khawar Rashid', 'Rawalpindi', 'anti_corruption', null, 'special_judge'],
    ['Muhammad Bilal Baig', 'Dera Ghazi Khan', 'anti_corruption', null, 'special_judge'],
    ['Muhammad Khalid Ishaq', 'Bahawalpur', 'anti_corruption', null, 'special_judge'],
    ['Muhammad Jamil', 'Lahore', 'anti_corruption', null, 'special_judge'],
    ['Muhammad Nadeem', 'Multan', 'anti_corruption', null, 'special_judge'],
    ['Muhammad Masuood Hussain', 'Sahiwal', 'anti_corruption', null, 'special_judge'],
    ['Muhammad Saeed Rafiq', 'Gujranwala', 'anti_corruption', null, 'special_judge'],

    // Anti-Terrorism Courts
    ['Manzer Ali Gill', 'Lahore', 'anti_terrorism', 'I', null],
    ['Shahid Sikandar', 'Lahore', 'anti_terrorism', 'II', null],
    ['Malik Abid Hussain', 'Lahore', 'anti_terrorism', 'III', null],
    ['Amjad Ali Shah', 'Rawalpindi', 'anti_terrorism', 'I', null],
    ['Amjad Iqbal Ranjha', 'Multan', 'anti_terrorism', 'II', null],
    ['Syed Faisal Raza Gilani', 'Sargodha', 'anti_terrorism', null, null],
    ['Waseem Mubarik', 'Faisalabad', 'anti_terrorism', null, null],
    ['Muhammad Rizwan Arif', 'Dera Ghazi Khan', 'anti_terrorism', null, null],
    ['Muhammad Asif', 'Bahawalpur', 'anti_terrorism', null, null],
    ['Muhammad Mohsin', 'Gujranwala', 'anti_terrorism', null, null],

    // Banking Courts
    ['Abid Ali', 'Lahore', 'banking', 'I', null],
    ['Arshad Iqbal', 'Lahore', 'banking', 'II', null],
    ['Muhammad Kashif', 'Lahore', 'banking', 'III', null],
    ['Muhammad Farrukh Hameed', 'Lahore', 'banking', 'IV', null],
    ['Ms. Misbah Khan', 'Lahore', 'banking', 'V', null],
    ['Humayun Saeed', 'Lahore', 'banking', 'VI', null],
    ['Muhammad Umar', 'Lahore', 'banking', 'VII', null],
    ['Munsif Khan', 'Multan', 'banking', 'II', null],
    ['Shahbaz Hussain', 'Bahawalpur', 'banking', 'I', null],
    ['Adnan Mushtaq', 'Bahawalpur', 'banking', 'II', null],
    ['Iftikhar-un-Nabi', 'Faisalabad', 'banking', 'II', null],
    ['Muzzammil Musa', 'Gujranwala', 'banking', 'I', null],
    ['Safdar Iqbal', 'Hafizabad', 'banking', null, null],
    ['Muhammad Ijaz Butt', 'Toba Tek Singh', 'banking', null, null],
    ['Muhammad Yasin Shaheen', 'Vehari', 'banking', null, null],
    ['Raja Amjad Iqbal', 'Rawalpindi', 'banking', null, null],
    ['Muhammad Sharif', 'Gujrat', 'banking', null, null],
    ['Mumtaz Ahmad', 'Sargodha', 'banking', null, null],
    ['Atiq-ur-Rehman', 'Dera Ghazi Khan', 'banking', null, null],
    ['Muhammad Ajmal Khan Raja', 'Sialkot', 'banking', null, null],
    ['Tajammal Hussain', 'Sahiwal', 'banking', null, null],

    // Accountability Courts
    ['Muhammad Arif Rana', 'Lahore', 'accountability', 'I', null],
    ['Muhammad Riaz', 'Lahore', 'accountability', 'II', null],
    ['Naeem Ahmad', 'Multan', 'accountability', null, null],
    ['Ijaz Ali', 'Rawalpindi', 'accountability', null, null],

    // Drug Courts
    ['Shazib Saeed', 'Bahawalpur', 'drug', null, 'chairperson'],
    ['Muhammad Arif Khan Niazi', 'Gujranwala', 'drug', null, 'chairperson'],
    ['Muhammad Mazhar Saleem', 'Faisalabad', 'drug', null, 'chairperson'],
    ['Syed Imran Raza Naqvi', 'Rawalpindi', 'drug', null, 'chairperson'],
    ['Muhammad Saleem Iqbal', 'Lahore', 'drug', null, 'chairperson'],
    ['Khalil Ahmad Khan', 'Multan', 'drug', null, 'chairperson'],

    // Special Courts (Central)
    ['Ishfaq Ahmad', 'Lahore', 'central', 'I', null],
    ['Shahid Bashir', 'Lahore', 'central', 'II', null],
    ['Syed Azhar Ali Jafri', 'Lahore', 'central', 'III', null],
    ['Amjad Nazir Chaudhry', 'Gujranwala', 'central', 'I', null],
    ['Hamid Mahmood Khan', 'Gujranwala', 'central', 'II', null],
    ['Waseem-ur-Rehman Khan Khakwani', 'Multan', 'central', null, null],
    ['Abdul Rehman Muhammad Arif', 'Rawalpindi', 'central', null, null],
    ['Shamshad Ali Rana', 'Faisalabad', 'central', null, null],
    ['Ghulam Mujtaba', 'Bahawalpur', 'central', null, null],
    ['Ghulam Shabbir Hussain', 'Gujrat', 'central', null, null],

    // Special Courts (Customs, Taxation & Anti-Smuggling)
    ['Muhammad Sarfraz Akhtar', 'Lahore', 'customs', 'I', null],
    ['Muhammad Naeem Sheikh', 'Lahore', 'customs', 'II', null],
    ['Ms. Shabana Risalat', 'Rawalpindi', 'customs', null, null],
    ['Shahzadah Masud Sadiq', 'Multan', 'customs', null, null],

    // Special Courts (Control of Narcotic Substances)
    ['Ms. Ambreen Qureshi', 'Rawalpindi', 'cns', 'I', null],
    ['Khalid Mahmood Cheema', 'Rawalpindi', 'cns', 'II', null],

    // Special Courts (Offences in Banks)
    ['Shahzad Raza', 'Lahore', 'offences_banks', 'I', 'presiding_officer'],
    ['Naveed Akhtar', 'Lahore', 'offences_banks', 'II', 'presiding_officer'],
    ['Ms. Humaira-tuz-Zahra', 'Multan', 'offences_banks', null, 'presiding_officer'],

    // Child Protection Court
    ['Mubbashar Nadeem Khan', 'Lahore', 'child_protection', null, 'presiding_officer'],

    // Intellectual Property Tribunals
    ['Irfan Haider', 'Lahore', 'ipt', 'II', 'presiding_officer'],
    ['Raja Shahid Zamir', 'Multan', 'ipt', null, 'presiding_officer'],
    ['Gul Abbas', 'Faisalabad', 'ipt', null, 'presiding_officer'],

    // Punjab Service Tribunal
    ['Malik Ejaz Asif', 'Lahore', 'service_tribunal', null, 'member'],
    ['Afaq Ahmad', 'Lahore', 'service_tribunal', null, 'member'],
    ['Imtiaz Nadeem', 'Lahore', 'service_tribunal', null, 'member'],

    // Insurance Tribunals
    ['Tariq Mahmood', 'Multan', 'insurance_tribunal', null, 'member_legal'],
    ['Muhammad Yasir Nadeem Razzaq', 'Lahore', 'insurance_tribunal', null, 'member_legal'],
    ['Zulfiqar Ahmad Naeem', 'Rawalpindi', 'insurance_tribunal', null, 'member_legal'],

    // Appellate Tribunal, Punjab Revenue Authority
    ['Liaqat Ali Ranjha', 'Lahore', 'pra_tribunal', null, 'judicial_member'],
    ['Irfan Ahmad Sheikh', 'Lahore', 'pra_tribunal', null, 'judicial_member'],

    // LDA Bonafide Purchasers, Illegal Constructions and Illegal Housing Schemes Commission
    ['Shafqat Ullah Khan', 'Lahore', 'lda_commission', null, 'member'],
];
