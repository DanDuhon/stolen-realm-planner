import React from 'react'
import styled from '@emotion/styled'
import { isEmpty, orderBy } from 'lodash-es'
import Helmet from 'react-helmet'

import { buildVersion } from '../../constants'
import { useDispatch, useAppState } from '../../store'
import { isLearned, getPointsSpentInTree } from './index'
import { calculateScaledManaCost } from './helpers'
import Skill from './Skill'

const SPACING_OFFSET = 16
const SKILL_OFFSET = 64

const skillOffsetBumps = {
    // warrior
    fracture: 6,
    rage: 8,
    'life-cleave': 4,
    // ranger
    'trackers-mark': 4,
    'long-shot': 1,
    'piercing-shot': 1,
    'patient-hunter': 6,
    // shadow
    'necromancer-1': 12,
    // thief
    'dagger-throw': 5,
    escape: 2,
    'enduring-evasion': 4,
}

const getSkillOffsets = (skills) => {
    let lastTier = 0
    let offset = SPACING_OFFSET
    return skills.reduce((acc, skill, i) => {
        if (lastTier !== skill.tier) {
            offset = SPACING_OFFSET
            lastTier = skill.tier
        } else if (skill.requires) {
            offset = acc[skill.requires]
            if (skill.exclusiveWith) {
                if (acc[skill.exclusiveWith]) {
                    offset += SKILL_OFFSET / 2
                } else {
                    offset -= SKILL_OFFSET / 2
                }
            }
        } else {
            offset += SKILL_OFFSET + SPACING_OFFSET * 2
        }
        if (skillOffsetBumps[skill.id]) {
            offset += SPACING_OFFSET * skillOffsetBumps[skill.id]
        }
        acc[skill.id] = offset
        return acc
    }, {})
}

const Root = styled.div(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: 450,
}))

const ActiveSkills = styled.div(({ theme }) => ({
    position: 'relative',
    flex: 1,
    borderRight: '1px solid rgba(0, 0, 0, 0.5)',
}))

const PassiveSkills = styled.div(({ theme }) => ({
    position: 'relative',
    flex: 1,
    borderLeft: '1px solid rgba(0, 0, 0, 0.5)',
}))

const SectionTitle = styled.div(({ theme, align = 'left' }) => ({
    position: 'absolute',
    top: 0,
    left: align === 'left' ? 0 : 'auto',
    right: align === 'right' ? 0 : 'auto',
    padding: theme.spacing(1),
    color: theme.palette.text.highlight,
}))

const ErrorMessage = styled.div(({ theme }) => ({
    width: '100%',
    textAlign: 'center',
    color: theme.palette.text.error,
    padding: theme.spacing(1),
}))

const Checkbox = styled.input(({ theme }) => ({
    position: 'relative',
    top: 2,
    marginRight: theme.spacing(0.5),
}))
const CheckboxLabel = styled.label(({ theme }) => ({
    fontSize: '14px',
    fontFamily: theme.fonts.bodyText,
    cursor: 'pointer',
}))

const BottomLeftNote = styled.div(({ theme }) => ({
    position: 'absolute',
    bottom: 0,
    left: 0,
    padding: `${theme.spacing(0.5)}px ${theme.spacing(1)}px`,
    color: theme.palette.text.subdued,
    fontSize: '10px',
    fontFamily: 'Courier, monospace',
    textAlign: 'right',
}))

const BottomRightNote = styled(BottomLeftNote)(({ theme }) => ({
    left: 'auto',
    right: 0,
}))

export default function SkillTree({ id, title }) {
    const [shouldCalcDamage, setShouldCalcDamage] = React.useState(true)
    const dispatch = useDispatch()
    const { skills, character } = useAppState()
    const relevantSkills = skills[id]
    const ogImageUrl = `${window.location.origin}${process.env.PUBLIC_URL}/skill-tree-icons/${id}-min.png`

    if (!relevantSkills) {
        return <ErrorMessage>Something's wrong, sorry :(</ErrorMessage>
    }

    const activeSkills = relevantSkills.filter((s) => s.type === 'active')
    const passiveSkills = relevantSkills.filter((s) => s.type === 'passive')

    const activeSkillOffsetMap = getSkillOffsets(
        orderBy(activeSkills, ['tier', 'skillNum'], ['asc', 'desc'])
    )
    const passiveSkillOffsetMap = getSkillOffsets(
        orderBy(passiveSkills, ['tier', 'skillNum'], ['asc', 'asc'])
    )

    const getSkillPosition = (skill) => {
        return {
            right:
                skill.type === 'active' &&
                (activeSkillOffsetMap[skill.id] || 0),
            left:
                skill.type === 'passive' &&
                (passiveSkillOffsetMap[skill.id] || 0),
            top: Math.max(skill.tier - 1, 0) * 80 + 40,
        }
    }

    const pointsSpentInThisTree = getPointsSpentInTree(
        relevantSkills,
        character.learnedSkills
    )

    const requiredPointsForTier = (tier) => {
        return tier === 5 ? 10 : (tier - 1) * 2
    }

    const hasRequirement = (skill) => {
        return !!relevantSkills.find(
            (s) => s.requires && s.requires === skill.id
        )
    }

    const getSkillThatExcludesThisOne = (skill) => {
        return relevantSkills.find(
            (s) => s.exclusiveWith && s.exclusiveWith === skill.id
        )
    }

    const getRequiredSkill = (skill) => {
        return relevantSkills.find((s) => s.id === skill.requires)
    }

    const getReplacesSkill = (skill) => {
        return relevantSkills.find((s) => s.id === skill.replaces)
    }

    const getLearnability = (
        skill,
        learnedSkills,
        skillPointsRemaining,
        pointsSpentInThisTree
    ) => {
        let learnability = {
            canLearn: true,
            reason: '',
        }

        const requiredPoints = requiredPointsForTier(skill.tier)
        if (requiredPoints > pointsSpentInThisTree) {
            // spent points required by tier check
            learnability.canLearn = false
            learnability.reason = `Requires ${requiredPoints} points in previous tiers.`
        } else if (skillPointsRemaining - skill.skillPointCost < 0) {
            // available skill points check
            learnability.canLearn = false
            learnability.reason = 'Not enough skill points.'
        } else {
            // requirements check
            if (!isEmpty(skill.requires)) {
                const requiredSkill = getRequiredSkill(skill)
                if (!isLearned(requiredSkill, learnedSkills)) {
                    learnability.canLearn = false
                    learnability.reason = `Requires ${requiredSkill.title}.`
                }
            }
            // exclusion check
            const excludedBy = getSkillThatExcludesThisOne(skill)
            if (excludedBy && isLearned(excludedBy, learnedSkills)) {
                learnability.canLearn = false
                learnability.reason = `Disabled by ${excludedBy.title}.`
            }
        }
        return learnability
    }

    const toggleSkill = (skill) => {
        if (!isLearned(skill, character.learnedSkills)) {
            if (
                getLearnability(
                    skill,
                    character.learnedSkills,
                    character.skillPointsRemaining,
                    pointsSpentInThisTree
                ).canLearn
            ) {
                dispatch({ type: 'learnSkill', payload: skill })
                window.gtag('event', 'learn_skill', {
                    category: 'skills',
                    label: skill.title,
                })
            }
        } else {
            const futureLearnedSkills = relevantSkills.filter((s) =>
                character.learnedSkills.find(
                    (ls) => ls === s.id && s.id !== skill.id
                )
            )
            const futureLearnedSkillIds = futureLearnedSkills.map((x) => x.id)
            for (let i = 0; i < futureLearnedSkills.length; i++) {
                const skillPointsRemaining =
                    character.skillPointsRemaining +
                    futureLearnedSkills[i].skillPointCost
                if (
                    !getLearnability(
                        futureLearnedSkills[i],
                        futureLearnedSkillIds,
                        skillPointsRemaining,
                        getPointsSpentInTree(
                            relevantSkills,
                            futureLearnedSkillIds
                        ) - futureLearnedSkills[i].skillPointCost
                    ).canLearn
                ) {
                    console.log(
                        `Cannot unlearn ${skill.title} because it would invalidate other learned skills.`
                    )
                    return
                }
            }
            dispatch({ type: 'unlearnSkill', payload: skill })
            window.gtag('event', 'unlearn_skill', {
                category: 'skills',
                label: skill.title,
            })
        }
    }

    const mapSkills = (skills) => {
        let lastSkill
        return skills.map((skill) => {
            const isLeftSibling =
                skill.requires &&
                skill.exclusiveWith &&
                lastSkill?.exclusiveWith !== skill.id
            const isRightSibling =
                skill.requires &&
                skill.exclusiveWith &&
                lastSkill?.exclusiveWith === skill.id
            const result = (
                <Skill
                    key={skill.id}
                    skill={skill}
                    shouldCalcDamage={shouldCalcDamage}
                    scaledManaCost={calculateScaledManaCost(
                        skill.manaCost,
                        character.level
                    )}
                    pos={getSkillPosition(skill)}
                    toggleSkill={toggleSkill}
                    isLearned={isLearned(skill, character.learnedSkills)}
                    hasRequirement={hasRequirement(skill)}
                    learnability={getLearnability(
                        skill,
                        character.learnedSkills,
                        character.skillPointsRemaining,
                        pointsSpentInThisTree
                    )}
                    replaces={getReplacesSkill(skill)}
                    isOnlyChild={skill.requires && !skill.exclusiveWith}
                    isLeftSibling={isLeftSibling}
                    isRightSibling={isRightSibling}
                />
            )
            lastSkill = skill
            return result
        })
    }

    return (
        <Root>
            <Helmet>
                <meta property="og:image" content={ogImageUrl} />
            </Helmet>
            <ActiveSkills>
                <SectionTitle align="right">Active Skills</SectionTitle>
                {mapSkills(activeSkills)}
                <BottomLeftNote>
                    <Checkbox
                        id="calcDamageCheckbox"
                        type="checkbox"
                        checked={shouldCalcDamage}
                        onChange={(event) =>
                            setShouldCalcDamage(event.currentTarget.checked)
                        }
                    />
                    <CheckboxLabel htmlFor="calcDamageCheckbox">
                        Calculate Skill Damage
                    </CheckboxLabel>
                </BottomLeftNote>
            </ActiveSkills>
            <PassiveSkills>
                <SectionTitle>Passive Skills</SectionTitle>
                {mapSkills(passiveSkills)}
                <BottomRightNote>
                    Data reviewed as of client build: <b>{buildVersion}</b>
                    <br />
                    Damage calculations are still being tweaked for accuracy.
                </BottomRightNote>
            </PassiveSkills>
        </Root>
    )
}
