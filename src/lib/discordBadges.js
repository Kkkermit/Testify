function addBadges(badgeNames) {
    if (!badgeNames.length) return ["X"];
    const badgeMap = {
        "ActiveDeveloper": "<:VisualDev:1111819318951419944> ",
        "BugHunterLevel1": "<:bughunter:1189779614143365120>",
        "BugHunterLevel2": "<:bughunter2:1189779791142977629>",
        "PremiumEarlySupporter": "<:early:1240379450835865691>",
        "Partner": "<:partner:1189780724115574865>",
        "Staff": "<:partner:1189781064575623178>",
        "HypeSquadOnlineHouse1": "<:bravery:1189779986517860382>", 
        "HypeSquadOnlineHouse2": "<:brilliance:1189780421983088681>", 
        "HypeSquadOnlineHouse3": "<:balance:1189780198556708924>", 
        "Hypesquad": "<:hypersquad:1189780607673303060>",
        "CertifiedModerator": "<:mod:1240380119109996615>",
        "VerifiedDeveloper": "<:verifieddev:1189781284294242324>",
    };

    return badgeNames.map(badgeName => badgeMap[badgeName] || '❔');
}

module.exports = { addBadges };