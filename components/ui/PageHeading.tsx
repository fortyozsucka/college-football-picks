'use client'

import { Box, Heading, Text, useColorModeValue } from '@chakra-ui/react'

interface PageHeadingProps {
  eyebrow: string
  title: string
  subtitle?: string
}

export function PageHeading({ eyebrow, title, subtitle }: PageHeadingProps) {
  const eyebrowColor = useColorModeValue('brand.600', 'brand.400')
  const titleGradient = useColorModeValue(
    'linear(135deg, #171717 0%, #3a9860 55%, #6ade9c 100%)',
    'linear(135deg, #ffffff 0%, #93E9BE 50%, #6ade9c 100%)'
  )
  const subtitleColor = useColorModeValue('neutral.500', 'neutral.400')

  return (
    <Box textAlign="center">
      <Text
        fontSize="xs"
        fontWeight="800"
        letterSpacing="0.18em"
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
        fontWeight="900"
        letterSpacing="-0.03em"
        lineHeight="1.1"
      >
        {title}
      </Heading>
      {subtitle && (
        <Text fontSize="md" fontWeight="500" color={subtitleColor} mt={3} letterSpacing="0.01em">
          {subtitle}
        </Text>
      )}
    </Box>
  )
}
