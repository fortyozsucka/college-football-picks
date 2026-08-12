'use client'

import { Box, Heading, Text, useColorModeValue } from '@chakra-ui/react'

interface PageHeadingProps {
  eyebrow: string
  title: string
  subtitle?: string
}

export function PageHeading({ eyebrow, title, subtitle }: PageHeadingProps) {
  const eyebrowColor = useColorModeValue('neutral.500', 'neutral.400')
  const titleGradient = useColorModeValue(
    'linear(to-r, neutral.900, brand.600)',
    'linear(to-r, neutral.100, brand.400)'
  )

  return (
    <Box textAlign="center">
      <Text
        fontSize="xs"
        fontWeight="700"
        letterSpacing="0.14em"
        textTransform="uppercase"
        color={eyebrowColor}
        mb={2}
      >
        {eyebrow}
      </Text>
      <Heading
        size="2xl"
        bgGradient={titleGradient}
        bgClip="text"
        fontWeight="800"
        letterSpacing="-0.02em"
        lineHeight="1.15"
      >
        {title}
      </Heading>
      {subtitle && (
        <Text fontSize="lg" color={eyebrowColor} mt={3}>
          {subtitle}
        </Text>
      )}
    </Box>
  )
}
