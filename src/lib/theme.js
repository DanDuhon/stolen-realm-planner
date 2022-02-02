const spacingMultiplier = 8

export const theme = {
    palette: {
        primary: '#eb9944',
        text: {
            default: '#f9f9f9',
            subdued: '#878787',
            highlight: '#eb9944',
            error: '#bb3314',
        },
        background: {
            default: '#2c2724',
            paper: 'rgba(255, 255, 255, 0.1)',
            appBar: '#121110',
        },
    },
    fonts: {
        bodyText: 'Minion Pro, sans-serif',
        titleText: 'Trajan Pro, serif',
    },
    sizing: {
        appBarHeight: 64,
        containerMaxWidth: 1200,
        skillIcon: 56,
        skillTreeIcon: 78,
        iconBorderWidth: 3,
    },
    spacing: (amount) => amount * spacingMultiplier,
}
