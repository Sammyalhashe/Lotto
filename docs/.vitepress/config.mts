import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "AVAX Lotto Docs",
  description: "Documentation for the Avalanche Lottery Project",
  base: "/Lotto/", // Assumes repo name is 'Lotto'. If different, change this.
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Learning Guide', link: '/LEARNING_GUIDE' },
      { text: 'Reference', link: '/BLOCKCHAIN_DEV_REFERENCE' }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Home', link: '/' },
          { text: 'Agent Context', link: '/AGENTS' }
        ]
      },
      {
        text: 'Development',
        items: [
          { text: 'Learning Guide', link: '/LEARNING_GUIDE' },
          { text: 'Blockchain Reference', link: '/BLOCKCHAIN_DEV_REFERENCE' },
          { text: 'Yield Integration', link: '/YIELD_INTEGRATION_GUIDE' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Sammyalhashe/Lotto' }
    ]
  }
})
