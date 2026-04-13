import { Box, Image, List, Text } from "@chakra-ui/react";
import { useState } from "react";

import type { WalkPerson } from "./SurveyWalkGrid.types";

export function PersonAvatar({ person, size = "28px" }: { person: WalkPerson; size?: string }) {
    const label = person.name || person.uid || "?";
    const initial = label.slice(0, 1).toUpperCase();
    const [didPhotoFail, setDidPhotoFail] = useState(false);
    const [didGenericFail, setDidGenericFail] = useState(false);

    const genericAvatarSrc = "/assets/images/avatars/icon.png";
    const imageSrc = didPhotoFail ? genericAvatarSrc : person.photoURL;

    if (imageSrc && !didGenericFail) {
        return (
            <Image
                src={imageSrc}
                alt={`${label} profile`}
                boxSize={size}
                borderRadius="full"
                objectFit="cover"
                flexShrink={0}
                position={"relative"}
                onError={() => {
                    if (!didPhotoFail && person.photoURL) {
                        setDidPhotoFail(true);
                        return;
                    }

                    setDidGenericFail(true);
                }}
            />
        );
    }

    return (
        <Box
            aria-label={`${label} fallback avatar`}
            boxSize={size}
            borderRadius="full"
            bg="gray.500"
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="xs"
            fontWeight="bold"
            flexShrink={0}
        >
            {initial}
        </Box>
    );
}

export function PersonListItem({ person }: { person: WalkPerson }) {
    const label = person.name || person.uid;

    return (
        <List.Item key={person.uid} listStyleType="none" mb={1}>
            <Box display="flex" alignItems="center" gap={2}>
                <PersonAvatar person={person} size="24px"/>
                <Text mb={0}>{label}</Text>
            </Box>
        </List.Item>
    );
}
